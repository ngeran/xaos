// File: src/routes/backups.rs
// =========================================================================================
// File Path: src/routes/backups.rs
// Version: 1.1.0
//
// Description:
// Defines routes for configuration backups API.
//
// Key Features:
// - Endpoint to list all device backup folders
// - Endpoint to list backup files for a specific device
// - Endpoint to fetch specific backup file content
// - Endpoint to trigger backup execution
//
// Usage Guide:
// - GET /api/backups/devices → lists all device folders
// - GET /api/backups/device/:device_name → lists backup files for a device
// - GET /api/backups/file/:device_name/:filename → returns specific backup file content
// - POST /api/backups/run → triggers backup execution
// =========================================================================================

use axum::{routing::{get, post}, Router};
use crate::{api::backups, AppState};

// =============================================================================
// Route Configuration
// =============================================================================
// Define all backup-related routes and their handlers

pub fn routes() -> Router<AppState> {
    Router::new()
        // List all device backup folders
        .route("/api/backups/devices", get(backups::list_backup_devices))
        
        // List backup files for a specific device
        .route("/api/backups/device/:device_name", get(backups::list_device_backups))
        
        // Get specific backup file content
        .route("/api/backups/file/:device_name/:filename", get(backups::get_backup_file))
        
        // Trigger backup execution
        .route("/api/backups/run", post(backups::run_backup))
}
