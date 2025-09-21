// =========================================================================================
// FILE: src/api/backups.rs
// VERSION: 2.0.0
//
// DESCRIPTION:
// API handlers for backup operations. Communicates with Python FastAPI service
// via HTTP instead of direct script execution for proper microservices architecture.
//
// HOW TO GUIDE:
// 1. Add reqwest dependency to Cargo.toml: reqwest = { version = "0.11", features = ["json"] }
// 2. Ensure Python service is running on python_runner:8001
// 3. Endpoints match frontend expectations for seamless integration
//
// KEY FEATURES:
// - HTTP-based communication with Python service
// - Comprehensive error handling and logging
// - Consistent API structure with frontend expectations
// - Proper service discovery using Docker container names
// =========================================================================================

use axum::{extract::{State, Path}, Json};
use reqwest::Client;
use serde_json::json;
use tracing::{error, info, warn};

use crate::{models::{ApiError, ApiResult, BackupRequest, BackupResponse}, AppState};

// =============================================================================
// SECTION 1: MAIN BACKUP HANDLER
// =============================================================================
// Handles both GET (list devices) and POST (execute backup) requests

/// Unified handler for /api/backups/devices endpoint
/// GET: Lists available devices with backups
/// POST: Executes backup operation for specified devices
pub async fn backups_handler(
    State(state): State<AppState>,
    request: Option<Json<BackupRequest>>,
) -> ApiResult<Json<BackupResponse>> {
    // If no request body, handle as GET request (list devices)
    if request.is_none() {
        info!("Handling GET request for device listing");
        return list_devices().await;
    }
    
    // If request body exists, handle as POST request (execute backup)
    let backup_request = request.unwrap();
    info!("Handling POST request for backup operation");
    execute_backup(State(state), backup_request).await
}

// =============================================================================
// SECTION 2: DEVICE LISTING FUNCTION
// =============================================================================
// Calls Python API to retrieve list of devices with backups

/// Retrieves list of devices from Python API service
async fn list_devices() -> ApiResult<Json<BackupResponse>> {
    info!("Calling Python API to list devices");
    
    let client = Client::new();
    
    let response = client.get("http://python_runner:8000/api/backups/devices")
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Python API: {}", e);
            ApiError::InternalError(format!("Python API unavailable: {}", e))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Python API returned error: {} - {}", status, body);
        return Err(ApiError::InternalError(format!("Python API error: {}", status)));
    }

    let devices_data: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse Python API response: {}", e);
        ApiError::InternalError("Invalid response from Python API".to_string())
    })?;

    info!("Successfully retrieved device list");
    
    Ok(Json(BackupResponse {
        status: "success".to_string(),
        message: "Devices listed successfully".to_string(),
        logs: None,
        files: Some(devices_data),
    }))
}

// =============================================================================
// SECTION 3: BACKUP EXECUTION FUNCTION
// =============================================================================
// Calls Python API to execute backup operation

/// Executes backup operation via Python API service
async fn execute_backup(
    State(_state): State<AppState>,
    Json(backup_request): Json<BackupRequest>,
) -> ApiResult<Json<BackupResponse>> {
    info!("Starting backup operation for host: {}", backup_request.hostname);
    
    let client = Client::new();
    
    // Use port 8000 (internal container port)
    let response = client.post("http://python_runner:8000/api/backups/devices")
        .json(&backup_request)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Python API: {}", e);
            ApiError::InternalError(format!("Python API unavailable: {}", e))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Backup failed with status {}: {}", status, body);
        return Err(ApiError::InternalError(format!("Backup failed: {}", status)));
    }

    let result: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse backup response: {}", e);
        ApiError::InternalError("Invalid response from Python API".to_string())
    })?;

    info!("Backup completed successfully for host: {}", backup_request.hostname);
    
    Ok(Json(BackupResponse {
        status: "success".to_string(),
        message: "Backup completed successfully".to_string(),
        logs: None,
        files: Some(result),
    }))
}
// =============================================================================
// SECTION 4: DEVICE BACKUPS LISTING
// =============================================================================
// Calls Python API to list backup files for a specific device

/// Retrieves list of backup files for a specific device from Python API
pub async fn list_device_backups(
    Path(device_name): Path<String>,
) -> ApiResult<Json<BackupResponse>> {
    info!("Listing backups for device: {}", device_name);
    
    let client = Client::new();
    
    // Make HTTP request to Python service
    let response = client.get(&format!("http://python_runner:8001/api/backups/device/{}", device_name))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to connect to Python API: {}", e);
            ApiError::InternalError(format!("Python API unavailable: {}", e))
        })?;

    // Check for HTTP errors
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        error!("Failed to list backups for {}: {} - {}", device_name, status, body);
        return Err(ApiError::InternalError(format!("Failed to list backups: {}", status)));
    }

    // Parse successful response
    let backups_data: serde_json::Value = response.json().await.map_err(|e| {
        error!("Failed to parse backups response: {}", e);
        ApiError::InternalError("Invalid response from Python API".to_string())
    })?;

    info!("Successfully listed backups for device: {}", device_name);
    
    // Return formatted response
    Ok(Json(BackupResponse {
        status: "success".to_string(),
        message: "Backups listed successfully".to_string(),
        logs: None,
        files: Some(backups_data),
    }))
}

// =============================================================================
// SECTION 5: BACKUP FILE CONTENT RETRIEVAL
// =============================================================================
// Calls Python API to get content of a specific backup file

/// Retrieves content of a specific backup file
pub async fn get_backup_file(
    Path((device_name, filename)): Path<(String, String)>,
) -> ApiResult<Json<BackupResponse>> {
    info!("Retrieving backup file: {}/{}", device_name, filename);
    
    // Note: This endpoint would need to be implemented in Python API
    // For now, return a placeholder response
    warn!("Backup file content endpoint not fully implemented");
    
    Ok(Json(BackupResponse {
        status: "success".to_string(),
        message: "Backup file retrieval not implemented".to_string(),
        logs: None,
        files: Some(json!({
            "device": device_name,
            "filename": filename,
            "content": "Backup file content retrieval requires Python API implementation"
        })),
    }))
}
