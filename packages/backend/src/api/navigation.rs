// File Path: backend/src/api/navigation.rs
// Version: 3.1.1
// Description: API handlers for serving navigation menu data from YAML files with schema validation.
// Key Features:
// - Provides endpoints to serve navigation data as JSON.
// - Integrates with yaml_service for loading and validating YAML data.
// - Supports custom file paths via query parameters.
// - Includes endpoint to load main navigation from YAML.
// How-To Guide:
// 1. Place YAML config under shared/data/navigation.yaml.
// 2. Place schema under shared/schemas/navigation.schema.json.
// 3. Frontend calls `/api/navigation` or `/api/navigation/yaml` to get validated JSON.
// 4. Optional: validate manually using `/api/yaml/navigation/validate`.
// Change Log:
// - 3.1.1 (2025-09-14): Updated to use absolute data directory path.
// - 3.1.0 (2025-09-13): Updated get_navigation to load navigation.yaml using yaml_service.
// - 3.0.0 (2025-09-13): Integrated schema validation through yaml_service.
// - 2.0.0 (2025-09-13): Added YAML backend loading.
// - 1.0.0 (2025-09-10): Initial placeholder navigation API.

// ====================================================
// SECTION: Imports
// ====================================================
// This section imports dependencies for handling HTTP requests and state.

use axum::{
    extract::{Query, State},
    response::Json,
};
use std::collections::HashMap;
use crate::{
    models::ApiResult,
    AppState,
};

// ====================================================
// SECTION: Navigation Handler
// ====================================================
// This section defines the main navigation endpoint, loading data from YAML.

/// Loads navigation data from YAML and validates it against
/// `navigation.schema.json`, returning as JSON.
///
/// Query Parameters:
/// - `file` (optional): override YAML file name
///
/// Example:
/// GET /api/navigation?file=custom_navigation.yaml
pub async fn get_navigation(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let file_path = params.get("file").cloned();

    // Load and validate YAML using yaml_service
    // This will:
    // 1. Load navigation.yaml (or custom file) from shared/data
    // 2. Validate against navigation.schema.json
    // 3. Return parsed JSON on success
    let data = state
        .yaml_service
        .validate_yaml_data("navigation", file_path.as_deref())
        .await?;

    Ok(Json(data))
}

// ====================================================
// SECTION: YAML Navigation Handler
// ====================================================
// This section handles loading and validating navigation data from YAML
// using the yaml_service.

/// Loads navigation data from YAML and validates it against
/// `navigation.schema.json`. Duplicate of /api/navigation for legacy support.
///
/// Query Parameters:
/// - `file` (optional): override YAML file name
///
/// Example:
/// GET /api/navigation/yaml?file=custom_navigation.yaml
pub async fn get_navigation_from_yaml(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let file_path = params.get("file").cloned();

    // This will automatically:
    // 1. Load YAML (shared/data/navigation.yaml by default)
    // 2. Validate against shared/schemas/navigation.schema.json
    // 3. Return parsed JSON on success
    let data = state
        .yaml_service
        .validate_yaml_data("navigation", file_path.as_deref())
        .await?;

    Ok(Json(data))
}

// ====================================================
// SECTION: Settings Navigation Handler
// ====================================================
// This section handles loading settings sidebar navigation from YAML,
// potentially using a different schema.

/// Loads settings sidebar navigation from YAML.
/// Still separate from main nav to allow different schema.
pub async fn get_settings_navigation(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let file_path = params.get("file").cloned();

    let data = state
        .yaml_service
        .get_yaml_data("settingsSidebarNavigation", file_path.as_deref())
        .await?;

    Ok(Json(data))
}
