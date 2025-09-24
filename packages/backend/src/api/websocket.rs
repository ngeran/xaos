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
use tokio::task;
use uuid::Uuid;
use chrono::Utc;
use std::time::Duration;
use tokio::time::sleep;

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
        .route("/backups/devices", post(backup_handler))
}

/// Handler for upgrading a connection to a WebSocket
async fn ws_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(remote_addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
) -> Response {
    info!("WebSocket connection attempt from: {}", remote_addr);
    
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
    let job_id_clone = payload.job_id.clone();
    let device_clone = payload.device.clone();
    
    info!(
        "Job event broadcast request received for job: {}, device: {}, type: {}",
        job_id_clone, device_clone, payload.job_type
    );

    let job_event = JobEventPayload {
        job_id: payload.job_id,
        device: payload.device,
        job_type: payload.job_type,
        event_type: payload.event_type,
        status: payload.status,
        timestamp: Utc::now(),
        data: payload.data,
        error: payload.error,
    };

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


/// Request body for starting a backup
#[derive(Deserialize, Debug)]
pub struct StartBackupPayload {
    device_id: String,
}

/// Handler for starting a backup and reporting progress via WebSocket
async fn backup_handler(
    State(state): State<AppState>,
    Json(payload): Json<StartBackupPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("Backup request received for device: {}", payload.device_id);

    let job_id = Uuid::new_v4().to_string();
    let job_id_response_clone = job_id.clone(); // ADDED: Clone for the response
    let service_clone = Arc::clone(&state.websocket_service);
    let device_id_clone = payload.device_id.clone();

    task::spawn(async move {
        let start_event = JobEventPayload {
            job_id: job_id.clone(),
            device: device_id_clone.clone(),
            job_type: "backup".to_string(),
            event_type: "progress".to_string(),
            status: "in_progress".to_string(),
            data: serde_json::json!({"message": "Starting backup process..."}),
            error: None,
            timestamp: Utc::now(),
        };
        let _ = service_clone.broadcast_job_event(start_event).await;
        
        for i in 1..=3 {
            sleep(Duration::from_secs(2)).await;
            let progress_event = JobEventPayload {
                job_id: job_id.clone(),
                device: device_id_clone.clone(),
                job_type: "backup".to_string(),
                event_type: "progress".to_string(),
                status: "in_progress".to_string(),
                data: serde_json::json!({"message": format!("Processing step {} of 3...", i)}),
                error: None,
                timestamp: Utc::now(),
            };
            let _ = service_clone.broadcast_job_event(progress_event).await;
        }

        let complete_event = JobEventPayload {
            job_id,
            device: device_id_clone,
            job_type: "backup".to_string(),
            event_type: "completed".to_string(),
            status: "completed".to_string(),
            data: serde_json::json!({"message": "Backup successfully completed!"}),
            error: None,
            timestamp: Utc::now(),
        };
        let _ = service_clone.broadcast_job_event(complete_event).await;
    });

    Ok(Json(serde_json::json!({
        "status": "success",
        "message": "Backup process started successfully.",
        "job_id": job_id_response_clone, // CHANGED: Use the cloned variable
        "device_id": payload.device_id,
    })))
}
