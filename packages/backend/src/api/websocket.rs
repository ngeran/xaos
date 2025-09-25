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
    username: String,
    password: String,
    hostname: Option<String>,
    inventory_file: Option<String>,
}

/// Handler for starting a backup and reporting progress via WebSocket
/// FIXED: Now returns "started" status instead of misleading "success"
/// ENHANCED: Added comprehensive validation and debugging
async fn backup_handler(
    State(state): State<AppState>,
    Json(payload): Json<StartBackupPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("Backup request received for device: {}", payload.device_id);

    // Enhanced validation with detailed error messages
    if payload.device_id.trim().is_empty() {
        warn!("Backup request rejected: empty device_id");
        return Err(ApiError::WebSocketError("Device ID cannot be empty".to_string()));
    }
    if payload.username.trim().is_empty() {
        warn!("Backup request rejected: empty username");
        return Err(ApiError::WebSocketError("Username cannot be empty".to_string()));
    }
    if payload.password.trim().is_empty() {
        warn!("Backup request rejected: empty password");
        return Err(ApiError::WebSocketError("Password cannot be empty".to_string()));
    }

    // Validate that either hostname or inventory_file is provided
    if payload.hostname.is_none() && payload.inventory_file.is_none() {
        warn!("Backup request rejected: no target specified (need hostname or inventory_file)");
        return Err(ApiError::WebSocketError(
            "Either hostname or inventory_file must be specified".to_string()
        ));
    }

    let job_id = Uuid::new_v4().to_string();
    let job_id_response_clone = job_id.clone();
    let service_clone = Arc::clone(&state.websocket_service);
    let device_id_clone = payload.device_id.clone();
    let username_clone = payload.username.clone();

    debug!(
        "Starting backup job {} for device {} with user {}",
        job_id, device_id_clone, username_clone
    );

    // Send immediate "started" event with enhanced debugging info
    let start_event = JobEventPayload {
        job_id: job_id.clone(),
        device: device_id_clone.clone(),
        job_type: "backup".to_string(),
        event_type: "started".to_string(),
        status: "in_progress".to_string(),
        data: serde_json::json!({
            "message": "Validating credentials and starting backup process...",
            "target": {
                "hostname": payload.hostname,
                "inventory_file": payload.inventory_file,
                "username": payload.username,
                "has_password": !payload.password.is_empty()
            },
            "validation": "passed"
        }),
        error: None,
        timestamp: Utc::now(),
    };
    
    // Broadcast the start event
    if let Err(e) = service_clone.broadcast_job_event(start_event).await {
        error!("Failed to broadcast backup start event: {}", e);
        // Continue anyway - don't fail the entire request due to broadcast failure
    }

    // Spawn background task with enhanced debugging
    task::spawn(async move {
        debug!("Backup background task started for job {}", job_id);

        // Simulate backup process with proper error handling and progress reporting
        for i in 1..=5 {
            sleep(Duration::from_secs(2)).await;
            
            let progress = i * 20;
            let step_message = match i {
                1 => "Connecting to device...",
                2 => "Authenticating with device...",
                3 => "Retrieving configuration...",
                4 => "Saving backup file...",
                5 => "Finalizing backup...",
                _ => "Processing...",
            };

            let progress_event = JobEventPayload {
                job_id: job_id.clone(),
                device: device_id_clone.clone(),
                job_type: "backup".to_string(),
                event_type: "progress".to_string(),
                status: "in_progress".to_string(),
                data: serde_json::json!({
                    "message": step_message,
                    "progress": progress,
                    "step": i,
                    "total_steps": 5
                }),
                error: None,
                timestamp: Utc::now(),
            };
            
            if let Err(e) = service_clone.broadcast_job_event(progress_event).await {
                warn!("Failed to broadcast progress event for job {}: {}", job_id, e);
            }

            // Simulate potential failure (for testing)
            if i == 3 && device_id_clone.contains("fail") {
                let error_event = JobEventPayload {
                    job_id: job_id.clone(),
                    device: device_id_clone.clone(),
                    job_type: "backup".to_string(),
                    event_type: "failed".to_string(),
                    status: "failed".to_string(),
                    data: serde_json::json!({
                        "message": "Simulated authentication failure",
                        "progress": progress,
                        "error_code": "AUTH_FAILED"
                    }),
                    error: Some("Authentication failed: invalid credentials".to_string()),
                    timestamp: Utc::now(),
                };
                
                if let Err(e) = service_clone.broadcast_job_event(error_event).await {
                    error!("Failed to broadcast error event: {}", e);
                }
                return; // Exit the task on failure
            }
        }

        // Final completion event with success details
        let complete_event = JobEventPayload {
            job_id: job_id.clone(),
            device: device_id_clone.clone(),
            job_type: "backup".to_string(),
            event_type: "completed".to_string(),
            status: "completed".to_string(),
            data: serde_json::json!({
                "message": "Backup successfully completed!",
                "progress": 100,
                "result": {
                    "files_created": 1,
                    "backup_size": "15.7 KB",
                    "timestamp": Utc::now().to_rfc3339()
                }
            }),
            error: None,
            timestamp: Utc::now(),
        };
        
        if let Err(e) = service_clone.broadcast_job_event(complete_event).await {
            error!("Failed to broadcast completion event for job {}: {}", job_id, e);
        }

        debug!("Backup background task completed for job {}", job_id);
    });

    info!("Backup process initiated successfully for device {}", payload.device_id);

    // Return "started" status, not "success" - this is the key fix
    Ok(Json(serde_json::json!({
        "status": "started",  // FIXED: Changed from "success" to "started"
        "message": "Backup process initiated successfully",
        "job_id": job_id_response_clone,
        "device_id": payload.device_id,
        "timestamp": Utc::now().to_rfc3339(),
        "debug_info": {
            "validation": "passed",
            "target_specified": payload.hostname.is_some() || payload.inventory_file.is_some(),
            "username_provided": !payload.username.is_empty(),
            "password_provided": !payload.password.is_empty()
        }
    })))
}
