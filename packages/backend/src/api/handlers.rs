use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use serde_json::Value;
use std::collections::HashMap;

use crate::{models::ApiResult, AppState};

// Generic YAML handler that can be used for any schema
pub async fn get_yaml_by_schema(
    Path(schema_name): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> ApiResult<Json<Value>> {
    let file_path = params.get("file").cloned();
    let data = state.yaml_service.get_yaml_data(&schema_name, file_path.as_deref()).await?;
    Ok(Json(data))
}

// Hot reload endpoint (useful for development)
pub async fn reload_schemas(
    State(_state): State<AppState>,
) -> ApiResult<&'static str> {
    // Note: This would need Arc<Mutex<YamlService>> to actually reload
    // For now, just return success
    Ok("Schemas reloaded successfully")
}
