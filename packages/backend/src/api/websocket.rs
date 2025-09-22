// File: backend/src/api/websocket.rs
// Version: 2.0.2
// Key Features:
// - Fixed move issues in job event broadcasting
// - Removed unused variables
// - Enhanced error handling

use axum::{
    extract::{
        ws::WebSocketUpgrade,
        State,
        ConnectInfo,
    },
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use std::{net::SocketAddr, sync::Arc};
use tracing::{error, info};

use crate::{
    models::{
        websocket::{SubscriptionTopic, WsMessage, JobEventPayload},
        ApiError,
    },
    AppState,
};

/// Defines all WebSocket-related API routes
pub fn websocket_routes() -> Router<AppState> {
    Router::new()
        .route("/ws", get(ws_handler))
        .route("/status", get(get_status))
        .route("/connections", get(get_connections))
        .route("/broadcast", post(broadcast_handler))
        .route("/jobs/broadcast", post(broadcast_job_event_handler))
}

/// Handler for upgrading a connection to a WebSocket
/// Fixed: Proper error handling and simplified approach
async fn ws_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(remote_addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
) -> Response {
    info!("WebSocket connection attempt from: {}", remote_addr);
    
    // Return the upgrade response immediately
    ws.on_upgrade(move |socket| async move {
        info!("WebSocket upgrade successful for: {}", remote_addr);
        
        let service = Arc::clone(&state.websocket_service);
        if let Err(e) = service.handle_connection(socket, Some(remote_addr)).await {
            error!("Failed to handle WebSocket connection for {}: {}", remote_addr, e);
        }
    })
}

/// Handler for getting WebSocket service status
async fn get_status(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("WebSocket status request received");
    
    let stats = state.websocket_service.get_service_stats().await;
    info!("WebSocket status retrieved successfully");
    Ok(Json(stats))
}

/// Handler for getting active connections
async fn get_connections(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("Active connections request received");
    
    let connections = state.websocket_service.get_active_connections().await;
    info!("Active connections retrieved: {}", connections.len());
    Ok(Json(serde_json::json!(connections)))
}

/// Request body for broadcasting messages
#[derive(Deserialize, Debug)]
pub struct BroadcastPayload {
    topic: SubscriptionTopic,
    message: String,
}

/// Handler for broadcasting messages to a specific topic
async fn broadcast_handler(
    State(state): State<AppState>,
    Json(payload): Json<BroadcastPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!(
        "Broadcast request received for topic: {}, message: {}",
        payload.topic.to_string(),
        payload.message
    );

    // Validate payload
    if payload.message.is_empty() {
        return Err(ApiError::WebSocketError("Message cannot be empty".to_string()));
    }
    
    if payload.message.len() > 1024 {
        return Err(ApiError::WebSocketError(
            "Message too long (max 1024 characters)".to_string(),
        ));
    }

    let ws_message = WsMessage::Custom {
        event: "broadcast_event".to_string(),
        payload: serde_json::json!({ "message": payload.message }),
    };

    state
        .websocket_service
        .broadcast_to_topic(&payload.topic, ws_message)
        .await?;

    info!("Broadcast successful for topic: {}", payload.topic.to_string());
    Ok(Json(serde_json::json!({
        "status": "success",
        "message": "Broadcast sent successfully",
        "topic": payload.topic.to_string()
    })))
}

/// Request body for broadcasting job events
#[derive(Deserialize, Debug)]
pub struct JobEventBroadcastPayload {
    job_id: String,
    device: String,
    job_type: String,
    event_type: String,
    status: String,
    data: serde_json::Value,
    error: Option<String>,
}

/// Handler for broadcasting job events for real-time device operation updates
async fn broadcast_job_event_handler(
    State(state): State<AppState>,
    Json(payload): Json<JobEventBroadcastPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Clone values for logging before moving them
    let job_id_clone = payload.job_id.clone();
    let device_clone = payload.device.clone();
    
    info!(
        "Job event broadcast request received for job: {}, device: {}, type: {}",
        job_id_clone, device_clone, payload.job_type
    );

    // Create job event payload - move the values
    let job_event = JobEventPayload {
        job_id: payload.job_id,
        device: payload.device,
        job_type: payload.job_type,
        event_type: payload.event_type,
        status: payload.status,
        timestamp: chrono::Utc::now(),
        data: payload.data,
        error: payload.error,
    };

    // Broadcast to job events topic
    state
        .websocket_service
        .broadcast_job_event(job_event)
        .await?;

    info!(
        "Job event broadcast successful for job: {}, device: {}",
        job_id_clone, device_clone
    );
    
    Ok(Json(serde_json::json!({
        "status": "success",
        "message": "Job event broadcast successfully",
        "job_id": job_id_clone,
        "device": device_clone
    })))
}
