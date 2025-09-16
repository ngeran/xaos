
//! WebSocket Communication Routes
//! 
//! Handles real-time WebSocket connections and statistics

use axum::Router;
use crate::AppState;

/// Creates WebSocket-related routes
/// 
/// Merges the existing WebSocket routes from the api::websocket module
pub fn routes() -> Router<AppState> {
    crate::api::websocket::websocket_routes()
}
