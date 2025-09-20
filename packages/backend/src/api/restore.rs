// =========================================================================================
// File Path: src/api/restore.rs
// Version: 1.1.0
//
// Description:
// API handlers for restoring configuration backups. Calls the Python RestoreConfig worker
// with required parameters.
//
// Key Features:
// - POST /api/restore/run executes restore process for a device
// - Captures stdout/stderr logs
// - Returns structured JSON with status, message, and logs
//
// Usage Guide:
// POST /api/restore/run → { hostname, username, password, backup_file }
//
// Change Log:
// - 1.1.0: Fixed error handling and route registration
// - 1.0.0: Initial implementation
// =========================================================================================

use axum::{extract::State, response::Json};
use serde::{Deserialize, Serialize};
use tokio::process::Command;

use crate::{AppState, models::{ApiResult, ApiError}};

// =========================================================================================
// SECTION 1: REQUEST/RESPONSE STRUCTS
// Data structures for restore request and response
// =========================================================================================

#[derive(Deserialize)]
pub struct RestoreRequest {
    pub hostname: String,
    pub username: String,
    pub password: String,
    pub backup_file: String,
}

#[derive(Serialize)]
pub struct RestoreResponse {
    pub status: String,
    pub message: String,
    pub logs: Option<String>,
}

// =========================================================================================
// SECTION 2: HANDLER IMPLEMENTATION
// Main restore execution handler
// =========================================================================================

pub async fn run_restore(
    State(_state): State<AppState>,
    Json(payload): Json<RestoreRequest>,
) -> ApiResult<Json<RestoreResponse>> {
    let output = Command::new("python3")
        .arg("RestoreConfig.py")
        .arg(&payload.hostname)
        .arg(&payload.username)
        .arg(&payload.password)
        .arg(&payload.backup_file)
        .output()
        .await
        .map_err(|e| ApiError::ExecutionError(format!("Failed to run RestoreConfig.py: {}", e)))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    let status = if output.status.success() { "SUCCESS" } else { "FAILED" };
    let message = if output.status.success() {
        format!("Restore for {} completed successfully", payload.hostname)
    } else {
        format!("Restore for {} failed", payload.hostname)
    };

    Ok(Json(RestoreResponse {
        status: status.into(),
        message,
        logs: Some(format!("stdout:\n{}\nstderr:\n{}", stdout, stderr)),
    }))
}
