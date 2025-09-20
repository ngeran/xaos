
// =========================================================================================
// File Path: src/routes/restore.rs
// Version: 1.0.0
//
// Description:
// Defines routes for configuration restore API.
//
// Key Features:
// - Endpoint to trigger a restore from a backup file
//
// Usage Guide:
// - POST /api/restore/run → triggers a restore operation
//
// Change Log:
// - 1.0.0: Initial implementation
// =========================================================================================

use axum::{routing::post, Router};
use crate::{api::restore, AppState};

// =============================================================================
// Route Configuration
// =============================================================================
// Define all restore-related routes and their handlers

pub fn routes() -> Router<AppState> {
    Router::new()
        // Run restore operation
        .route("/api/restore/run", post(restore::run_restore))
}
