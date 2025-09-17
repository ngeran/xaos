
// File Path: src/api/inventory.rs
// Version: 1.0.0
//
// Description:
// API handlers for accessing the network inventory (routers, switches, firewalls).
//
// Key Features:
// - Loads inventory.yaml using YamlService
// - Returns structured JSON response
// - Provides error handling for missing/invalid YAML
//
// Usage Guide:
// GET /api/inventory → returns full inventory
//
// Change Log:
// - 1.0.0: Initial implementation

use axum::{extract::State, response::Json};
use serde_json::Value;

use crate::{AppState, models::ApiResult};

/// Handler to return the full inventory
pub async fn get_inventory(State(state): State<AppState>) -> ApiResult<Json<Value>> {
    // Load inventory.yaml from shared/data
    let data = state.yaml_service
        .get_yaml_data("inventory", None)
        .await?;
    
    Ok(Json(data))
}
