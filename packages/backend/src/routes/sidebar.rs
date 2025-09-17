// Version: 1.1.0
//
// Description:
// Defines routes for sidebar configuration API.
//
// Key Features:
// - Parameterized endpoint to fetch specific sidebar configurations
// - Optional endpoint to list all available sidebars
//
// Usage Guide:
// - GET /api/sidebar/{sidebar_id} - Get specific sidebar config
// - GET /api/sidebars - List all available sidebars (optional)

use axum::{routing::get, Router};
use crate::{api::sidebar, AppState};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/sidebar/:sidebar_id", get(sidebar::get_sidebar))
        .route("/api/sidebars", get(sidebar::get_all_sidebars)) // Optional
}
