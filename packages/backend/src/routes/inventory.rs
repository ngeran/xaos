
// File Path: src/routes/inventory.rs
// Version: 1.0.0
//
// Description:
// Defines routes for network inventory API.
//
// Key Features:
// - Single endpoint to fetch inventory.yaml
//
// Usage Guide:
// - GET /api/inventory

use axum::{routing::get, Router};
use crate::{api::inventory, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/inventory", get(inventory::get_inventory))
}
