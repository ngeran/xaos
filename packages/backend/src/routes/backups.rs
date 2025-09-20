// =============================================================================
// File Path: src/routes/backups.rs
// Version: 1.3.0
//
// Description:
// API router for all backup-related endpoints.
//
// Key Features:
// - Aggregates routes for listing devices, listing files, getting content, and running backups.
//
// Change Log:
// - 1.3.0: Removed unused imports to fix compiler warnings.
// - 1.2.0: Unified GET and POST routes for /api/backups/devices to a single handler.
// - 1.1.0: Added explicit GET and POST routes for backup and restore.
// - 1.0.0: Initial implementation of the backups router.
// =============================================================================

use axum::{routing::get, Router};
use crate::{api::backups, AppState};

// =============================================================================
// Route Configuration
// =============================================================================
// Define all backup-related routes and their handlers

pub fn routes() -> Router<AppState> {
    Router::new()
        // Unified handler for both GET (list) and POST (run) for /api/backups/devices
        .route("/api/backups/devices", get(backups::backups_handler).post(backups::backups_handler))
        .route("/api/backups/device/:device_name", get(backups::list_device_backups))
        .route("/api/backups/file/:device_name/:filename", get(backups::get_backup_file))
}
