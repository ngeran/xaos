// File Path: src/api/backups.rs
// Version: 1.0.0
//
// Description:
// API handlers for accessing configuration backups.
//
// Key Features:
// - Lists all device folders in shared/data/backups directory
// - Lists all backup files for a specific device
// - Returns backup file content as text
// - Provides error handling for missing files/directories
//
// Usage Guide:
// GET /api/backups/devices → lists all device folders
// GET /api/backups/device/:device_name → lists backup files for a device
// GET /api/backups/file/:device_name/:filename → returns backup file content

use axum::response::Json;
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;

use crate::models::ApiResult;
use crate::models::ApiError;

// =============================================================================
// Backup Devices Listing
// =============================================================================

/// Handler to list all device folders in the backups directory
pub async fn list_backup_devices() -> ApiResult<Json<Value>> {
    // Define the backups directory path
    let backups_path = Path::new("../shared/data/backups");

    // Check if directory exists
    if !backups_path.exists() {
        return Ok(Json(json!({
            "devices": [],
            "message": "Backups directory not found",
            "path": "../shared/data/backups",
            "absolute_path": backups_path.canonicalize().ok().and_then(|p| p.to_str().map(|s| s.to_string()))
        })));
    }

    // Read directory contents
    let mut entries = fs::read_dir(backups_path).await?;
    let mut device_folders = Vec::new();

    // Iterate through directory entries
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();

        // Check if it's a directory (device folder)
        if path.is_dir() {
            if let Some(device_name) = path.file_name().and_then(|n| n.to_str()) {
                // Get directory metadata
                let metadata = entry.metadata().await?;
                
                // Count backup files in the device directory
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

    // Sort devices by name
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

// =============================================================================
// Device Backup Files Listing
// =============================================================================

/// Handler to list backup files for a specific device
pub async fn list_device_backups(
    axum::extract::Path(device_name): axum::extract::Path<String>
) -> ApiResult<Json<Value>> {
    // Construct the device backup directory path
    let device_path = Path::new("../shared/data/backups").join(&device_name);

    // Check if device directory exists
    if !device_path.exists() {
        return Err(ApiError::NotFound(format!("Device '{}' not found in backups", device_name)));
    }

    // Read directory contents
    let mut entries = fs::read_dir(&device_path).await?;
    let mut backup_files = Vec::new();

    // Iterate through directory entries
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();

        // Check if it's a file (backup file)
        if path.is_file() {
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // Get file metadata
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

    // Sort files by modification time (newest first)
    backup_files.sort_by(|a, b| {
        let a_modified = a.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        let b_modified = b.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        b_modified.cmp(&a_modified) // Descending order
    });

    Ok(Json(json!({
        "device": device_name,
        "backups": backup_files,
        "count": backup_files.len(),
        "path": device_path.to_str().unwrap_or("")
    })))
}

// =============================================================================
// Backup File Content Access
// =============================================================================

/// Handler to get a specific backup file content
pub async fn get_backup_file(
    axum::extract::Path((device_name, filename)): axum::extract::Path<(String, String)>
) -> ApiResult<String> {
    // Construct the backup file path
    let file_path = Path::new("../shared/data/backups")
        .join(&device_name)
        .join(&filename);

    // Check if file exists
    if !file_path.exists() {
        return Err(ApiError::NotFound(format!("Backup file '{}' not found for device '{}'", filename, device_name)));
    }

    // Read file content as text
    let content = fs::read_to_string(&file_path).await?;

    Ok(content)
}

// =============================================================================
// Helper Functions
// =============================================================================

/// Count backup files in a device directory
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