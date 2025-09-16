//! Health Check Routes
//! 
//! Provides health monitoring and system status endpoints

use axum::{routing::get, Router};
use crate::AppState;

/// Health check endpoint
/// Returns "OK" if server is running correctly
pub async fn health_check() -> &'static str {
    "OK"
}

/// Creates health-related routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check))
}
