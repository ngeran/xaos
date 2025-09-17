// File Path: src/api/sidebar.rs
// Version: 1.1.0
//
// Description:
// API handlers for accessing sidebar navigation configurations.
//
// Key Features:
// - Loads specific sidebar YAML files using a parameter
// - Returns structured JSON response
// - Provides error handling for missing/invalid YAML
//
// Usage Guide:
// GET /api/sidebar/{sidebar_id} → returns specific sidebar configuration
//
// Change Log:
// - 1.1.0: Added parameterized sidebar support
// - 1.0.0: Initial implementation

use axum::{extract::{State, Path}, response::Json};
use serde_json::Value;

use crate::{AppState, models::ApiResult};

/// Handler to return a specific sidebar configuration
pub async fn get_sidebar(
    State(state): State<AppState>,
    Path(sidebar_id): Path<String>,
) -> ApiResult<Json<Value>> {
    // Load specific sidebar YAML from shared/data/sidebars
    let data = state.yaml_service
        .get_yaml_data(&format!("sidebars/{}", sidebar_id), None)
        .await?;
    
    Ok(Json(data))
}

/// Handler to return all available sidebar configurations (optional)
/// Currently returns empty response - implement later if needed
pub async fn get_all_sidebars() -> ApiResult<Json<Value>> {
    // This would require implementing a method to list available sidebar files
    // For now, we'll return an empty object
    Ok(Json(serde_json::json!({})))
}
