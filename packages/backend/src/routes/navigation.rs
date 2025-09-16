// File Path: backend/src/routes/navigation.rs
// Version: 3.0.0
// Description: Defines Axum routes for navigation-related API endpoints.
// Key Features:
// - Exposes endpoints for retrieving navigation configurations.
// - Integrates with yaml_service to load and validate YAML-based navigation data.
// - Supports query parameters for custom file paths.
// How-To Guide:
// 1. Ensure yaml_service is initialized in AppState with the correct schema directory (../shared/schemas).
// 2. Place navigation.yaml and navigation.schema.json in shared/data and shared/schemas, respectively.
// 3. Access endpoints like /api/navigation/yaml to retrieve validated navigation data.
// Change Log:
// - 3.0.0 (2025-09-13): Integrated schema validation through yaml_service.
// - 2.0.0 (2025-09-13): Added YAML backend loading.
// - 1.0.0 (2025-09-10): Initial placeholder navigation API.

// ====================================================
// SECTION: Imports and Route Definition
// ====================================================
// This section imports necessary dependencies and defines the Axum router
// for navigation-related routes.

use axum::{routing::get, Router};
use crate::AppState;

/// Creates navigation-related routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/navigation", get(crate::api::navigation::get_navigation))
        .route("/api/navigation/yaml", get(crate::api::navigation::get_navigation_from_yaml))
        .route("/api/navigation/settings", get(crate::api::navigation::get_settings_navigation))
}
