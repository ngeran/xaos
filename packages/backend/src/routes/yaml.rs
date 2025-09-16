//! YAML Data Management Routes
//! 
//! Handles YAML schema validation, data retrieval, and schema management

use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::get,
    Router,
};
use crate::{AppState, models};

/// Validate YAML data against a specific schema
/// 
/// # Parameters
/// - `schema_name`: Name of the schema to validate against
/// - `file_path`: Optional path to YAML file (uses default if not provided)
pub async fn validate_yaml_data(
    Path(schema_name): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    State(state): State<AppState>,
) -> models::ApiResult<Json<serde_json::Value>> {
    let file_path = params.get("file").cloned();
    let validation_result = state.yaml_service.validate_yaml_data(&schema_name, file_path.as_deref()).await?;
    Ok(Json(validation_result))
}

/// List all available schemas
/// Returns a JSON array of schema names
pub async fn list_schemas(
    State(state): State<AppState>,
) -> models::ApiResult<Json<Vec<String>>> {
    let schemas = state.yaml_service.list_available_schemas().await?;
    Ok(Json(schemas))
}

/// Creates YAML-related routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/yaml/:schema_name", get(crate::api::handlers::get_yaml_by_schema))
        .route("/api/yaml/:schema_name/validate", get(validate_yaml_data))
        .route("/api/schemas", get(list_schemas))
        .route("/api/reload", get(crate::api::handlers::reload_schemas))
}
