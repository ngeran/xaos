// File Path: src/routes/inventory.rs
// Version: 1.1.0
//
// Description:
// Defines routes for network inventory API.
//
// Key Features:
// - Endpoint to fetch inventory.yaml
// - Endpoint to list all inventory files
// - Endpoint to fetch specific inventory files
//
// Usage Guide:
// - GET /api/inventory → returns full inventory
// - GET /api/inventory/list → lists all YAML files in inventories directory
// - GET /api/inventory/file/:filename → returns specific inventory file
//
// Change Log:
// - 1.1.0: Added routes for listing and accessing inventory files
// - 1.0.0: Initial implementation
 
use axum::{routing::get, Router};
use crate::{api::inventory, AppState};
 
// =============================================================================
// Route Configuration
// =============================================================================
// Define all inventory-related routes and their handlers
 
pub fn routes() -> Router<AppState> {
    Router::new()
        // Main inventory endpoint
        .route("/api/inventory", get(inventory::get_inventory))
 
        // List all inventory files
        .route("/api/inventory/list", get(inventory::list_inventory_files))
 
        // Get specific inventory file
        .route("/api/inventory/file/:filename", get(inventory::get_inventory_file))
}