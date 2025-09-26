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
use tracing::{error, info, debug, warn};
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

/// FIXED: Defines all WebSocket-related API routes with correct paths
pub fn websocket_routes() -> Router<AppState> {
    Router::new()
        .route("/ws", get(ws_handler))
        .route("/status", get(get_status))
        .route("/connections", get(get_connections))
        .route("/broadcast", post(broadcast_handler))
        .route("/jobs/broadcast", post(broadcast_job_event_handler))
        // FIXED: Added the missing /backups/devices route that the frontend is calling
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

/// FIXED: Request body structure to match what the frontend is sending
#[derive(Deserialize, Debug)]
pub struct StartBackupPayload {
    device_id: String,
    hostname: Option<String>,
    inventory_file: Option<String>,
    username: String,
    password: String,
}

/// FIXED: Handler for starting a backup and reporting progress via WebSocket
/// This is the endpoint the frontend is actually calling: /backups/devices
// Replace your backup_handler with this simplified debugging version
async fn backup_handler(
    State(state): State<AppState>,
    Json(payload): Json<StartBackupPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    println!("🚀 BACKUP HANDLER CALLED for device: {}", payload.device_id);

    // Basic validation
    if payload.device_id.trim().is_empty() {
        return Err(ApiError::WebSocketError("Device ID cannot be empty".to_string()));
    }
    if payload.username.trim().is_empty() {
        return Err(ApiError::WebSocketError("Username cannot be empty".to_string()));
    }
    if payload.password.trim().is_empty() {
        return Err(ApiError::WebSocketError("Password cannot be empty".to_string()));
    }

    let job_id = Uuid::new_v4().to_string();
    let job_id_clone = job_id.clone();
    let service_clone = Arc::clone(&state.websocket_service);
    let device_id_clone = payload.device_id.clone();

    println!("✅ Generated job ID: {}", job_id);

    // Send immediate "started" event
    let start_event = JobEventPayload {
        job_id: job_id.clone(),
        device: device_id_clone.clone(),
        job_type: "backup".to_string(),
        event_type: "started".to_string(),
        status: "in_progress".to_string(),
        data: serde_json::json!({
            "message": "Backup process initiated successfully",
        }),
        error: None,
        timestamp: Utc::now(),
    };
    
    println!("📡 Broadcasting start event...");
    match service_clone.broadcast_job_event(start_event).await {
        Ok(_) => println!("✅ Start event broadcast successful"),
        Err(e) => println!("❌ Start event broadcast failed: {}", e),
    }

    // SIMPLIFIED: Spawn a simple background task
    println!("🔧 Spawning background task...");
    task::spawn(async move {
        println!("🏃 Background task STARTED for job: {}", job_id);
        
        // Wait 3 seconds then send progress
        tokio::time::sleep(Duration::from_secs(3)).await;
        println!("📈 Sending progress event for job: {}", job_id);
        
        let progress_event = JobEventPayload {
            job_id: job_id.clone(),
            device: device_id_clone.clone(),
            job_type: "backup".to_string(),
            event_type: "progress".to_string(),
            status: "in_progress".to_string(),
            data: serde_json::json!({
                "message": "Step 1: Connecting to device...",
                "progress": 25
            }),
            error: None,
            timestamp: Utc::now(),
        };
        
        match service_clone.broadcast_job_event(progress_event).await {
            Ok(_) => println!("✅ Progress event broadcast successful"),
            Err(e) => println!("❌ Progress event broadcast failed: {}", e),
        }
        
        // Wait another 3 seconds then complete
        tokio::time::sleep(Duration::from_secs(3)).await;
        println!("🎉 Sending completion event for job: {}", job_id);
        
        let complete_event = JobEventPayload {
            job_id: job_id.clone(),
            device: device_id_clone.clone(),
            job_type: "backup".to_string(),
            event_type: "completed".to_string(),
            status: "completed".to_string(),
            data: serde_json::json!({
                "message": "Backup completed successfully!",
                "progress": 100
            }),
            error: None,
            timestamp: Utc::now(),
        };
        
        match service_clone.broadcast_job_event(complete_event).await {
            Ok(_) => println!("✅ Completion event broadcast successful"),
            Err(e) => println!("❌ Completion event broadcast failed: {}", e),
        }
        
        println!("🏁 Background task COMPLETED for job: {}", job_id);
    });

    println!("📤 Returning response for job: {}", job_id_clone);

    // Return immediate response
    Ok(Json(serde_json::json!({
        "status": "started",
        "message": "Backup process initiated successfully",
        "job_id": job_id_clone,
        "device_id": payload.device_id,
        "timestamp": Utc::now().to_rfc3339()
    })))
}
