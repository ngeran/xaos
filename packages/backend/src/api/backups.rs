// =========================================================================================
// File Path: src/api/backups.rs
// Version: 1.2.0
//
// Description:
// API handlers for managing configuration backups. Includes both file-system access
// (list devices, list backup files, read file content) and execution of the Python
// BackupConfig worker script.
//
// Key Features:
// - List all device folders in shared/data/backups
// - List all backup files for a specific device
// - Read backup file content as plain text
// - Trigger Python backup worker via POST /api/backups/run
//
// Usage Guide:
// GET  /api/backups/devices                → list all devices with backups
// GET  /api/backups/device/:device_name    → list backup files for a device
// GET  /api/backups/file/:device/:file     → return file content
// POST /api/backups/run                     → execute backup (hostname, username, password)
//
// Change Log:
// - 1.2.0: Fixed route registration and error handling
// - 1.1.0: Added run_backup endpoint
// - 1.0.0: Initial implementation
// =========================================================================================

use axum::{extract::State, response::Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::Path;
use tokio::{fs, process::Command};

use crate::models::{ApiError, ApiResult};
use crate::AppState;

// =========================================================================================
// SECTION 1: BACKUP DEVICES LISTING
// Lists all device folders in the backups directory
// =========================================================================================

pub async fn list_backup_devices() -> ApiResult<Json<Value>> {
    let backups_path = Path::new("../shared/data/backups");

    if !backups_path.exists() {
        return Ok(Json(json!({
            "devices": [],
            "message": "Backups directory not found",
            "path": "../shared/data/backups",
            "absolute_path": backups_path.canonicalize().ok().and_then(|p| p.to_str().map(|s| s.to_string()))
        })));
    }

    let mut entries = fs::read_dir(backups_path).await?;
    let mut device_folders = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();

        if path.is_dir() {
            if let Some(device_name) = path.file_name().and_then(|n| n.to_str()) {
                let metadata = entry.metadata().await?;
                let backup_count = count_backup_files(&path).await.unwrap_or(0);

                device_folders.push(json!({
                    "name": device_name,
                    "path": path.to_str().unwrap_or(""),
                    "backup_count": backup_count,
                    "modified": metadata.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                }));
            }
        }
    }

    device_folders.sort_by(|a, b| {
        a.get("name").and_then(|v| v.as_str()).unwrap_or("")
            .cmp(b.get("name").and_then(|v| v.as_str()).unwrap_or(""))
    });

    Ok(Json(json!({
        "devices": device_folders,
        "count": device_folders.len(),
        "path": "../shared/data/backups"
    })))
}

// =========================================================================================
// SECTION 2: DEVICE BACKUP FILES LISTING
// Lists backup files inside a specific device folder
// =========================================================================================

pub async fn list_device_backups(
    axum::extract::Path(device_name): axum::extract::Path<String>
) -> ApiResult<Json<Value>> {
    let device_path = Path::new("../shared/data/backups").join(&device_name);

    if !device_path.exists() {
        return Err(ApiError::NotFound(format!(
            "Device '{}' not found in backups",
            device_name
        )));
    }

    let mut entries = fs::read_dir(&device_path).await?;
    let mut backup_files = Vec::new();

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();

        if path.is_file() {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                let metadata = entry.metadata().await?;

                backup_files.push(json!({
                    "name": file_name,
                    "path": path.to_str().unwrap_or(""),
                    "size": metadata.len(),
                    "modified": metadata.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0)
                }));
            }
        }
    }

    backup_files.sort_by(|a, b| {
        let a_modified = a.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        let b_modified = b.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        b_modified.cmp(&a_modified)
    });

    Ok(Json(json!({
        "device": device_name,
        "backups": backup_files,
        "count": backup_files.len(),
        "path": device_path.to_str().unwrap_or("")
    })))
}

// =========================================================================================
// SECTION 3: BACKUP FILE CONTENT ACCESS
// Returns the plain text content of a backup file
// =========================================================================================

pub async fn get_backup_file(
    axum::extract::Path((device_name, filename)): axum::extract::Path<(String, String)>
) -> ApiResult<String> {
    let file_path = Path::new("../shared/data/backups")
        .join(&device_name)
        .join(&filename);

    if !file_path.exists() {
        return Err(ApiError::NotFound(format!(
            "Backup file '{}' not found for device '{}'",
            filename, device_name
        )));
    }

    let content = fs::read_to_string(&file_path).await?;
    Ok(content)
}

// =========================================================================================
// SECTION 4: RUN BACKUP HANDLER
// Executes the Python BackupConfig worker for a given device
// =========================================================================================

#[derive(Deserialize)]
pub struct BackupRequest {
    pub hostname: String,
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct BackupResponse {
    pub status: String,
    pub message: String,
    pub logs: Option<String>,
    pub files: Option<Value>,
}

pub async fn run_backup(
    State(_state): State<AppState>,
    Json(payload): Json<BackupRequest>,
) -> ApiResult<Json<BackupResponse>> {
    let output = Command::new("python3")
        .arg("BackupConfig.py")
        .arg(&payload.hostname)
        .arg(&payload.username)
        .arg(&payload.password)
        .output()
        .await
        .map_err(|e| ApiError::ExecutionError(format!("Failed to run BackupConfig.py: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let status = if output.status.success() { "SUCCESS" } else { "FAILED" };
    let message = if output.status.success() {
        format!("Backup for {} completed successfully", payload.hostname)
    } else {
        format!("Backup for {} failed", payload.hostname)
    };

    Ok(Json(BackupResponse {
        status: status.into(),
        message,
        logs: Some(format!("stdout:\n{}\nstderr:\n{}", stdout, stderr)),
        files: None, // could parse JSON output later
    }))
}

// =========================================================================================
// SECTION 5: HELPER FUNCTIONS
// =========================================================================================

async fn count_backup_files(device_path: &Path) -> Result<usize, std::io::Error> {
    let mut entries = fs::read_dir(device_path).await?;
    let mut count = 0;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_file() {
            count += 1;
        }
    }

    Ok(count)
}
