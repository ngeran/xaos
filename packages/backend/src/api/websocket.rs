// =================================================================================================
// FILE: websocket.rs
// VERSION: 2.0.0 - Enhanced Backup API Integration
// DESCRIPTION: 
// Comprehensive WebSocket management with backup API integration. Handles real-time progress
// updates and forwards backup requests to Python API for actual script execution.
// =================================================================================================

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
use reqwest::Client;

use crate::{
    models::{
        websocket::{SubscriptionTopic, WsMessage, JobEventPayload},
        ApiError,
    },
    AppState,
};

// =================================================================================================
// SECTION: ROUTE CONFIGURATION
// =================================================================================================

/// Defines all WebSocket-related API routes with correct paths
/// 
/// Routes:
/// - /ws: WebSocket connection endpoint
/// - /status: Service status check
/// - /connections: Active connections list
/// - /broadcast: Generic message broadcasting
/// - /jobs/broadcast: Job event broadcasting
/// - /api/backups/devices: Backup API endpoint (frontend-facing)
pub fn websocket_routes() -> Router<AppState> {
    Router::new()
        .route("/ws", get(ws_handler))
        .route("/status", get(get_status))
        .route("/connections", get(get_connections))
        .route("/broadcast", post(broadcast_handler))
        .route("/jobs/broadcast", post(broadcast_job_event_handler))
        .route("/api/backups/devices", post(backup_handler))
}

// =================================================================================================
// SECTION: WEB SOCKET CONNECTION MANAGEMENT
// =================================================================================================

/// Handler for upgrading a connection to a WebSocket
/// 
/// This endpoint:
/// - Accepts WebSocket upgrade requests
/// - Logs connection attempts
/// - Handles WebSocket protocol upgrade
/// - Delegates connection management to WebSocketService
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

// =================================================================================================
// SECTION: SERVICE STATUS & MONITORING
// =================================================================================================

/// Handler for getting WebSocket service status
/// 
/// Returns:
/// - Service statistics
/// - Connection counts
/// - Health status
async fn get_status(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("WebSocket status request received");
    
    let stats = state.websocket_service.get_service_stats().await;
    info!("WebSocket status retrieved successfully");
    Ok(Json(stats))
}

/// Handler for getting active WebSocket connections
/// 
/// Returns:
/// - List of active connections
/// - Connection metadata
async fn get_connections(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("Active connections request received");
    
    let connections = state.websocket_service.get_active_connections().await;
    info!("Active connections retrieved: {}", connections.len());
    Ok(Json(serde_json::json!(connections)))
}

// =================================================================================================
// SECTION: MESSAGE BROADCASTING
// =================================================================================================

/// Request body for broadcasting messages
#[derive(Deserialize, Debug)]
pub struct BroadcastPayload {
    topic: SubscriptionTopic,
    message: String,
}

/// Handler for broadcasting messages to a specific topic
/// 
/// Features:
/// - Message validation (length, content)
/// - Topic-based broadcasting
/// - Error handling for invalid messages
async fn broadcast_handler(
    State(state): State<AppState>,
    Json(payload): Json<BroadcastPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!(
        "Broadcast request received for topic: {}, message: {}",
        payload.topic.to_string(),
        payload.message
    );

    // Validate message
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

// =================================================================================================
// SECTION: JOB EVENT BROADCASTING
// =================================================================================================

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
/// 
/// This endpoint:
/// - Receives job progress events from Python API
/// - Broadcasts them to all connected WebSocket clients
/// - Supports real-time backup/restore progress updates
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

// =================================================================================================
// SECTION: BACKUP API INTEGRATION
// =================================================================================================

/// Request body structure for backup operations (matches frontend format)
#[derive(Deserialize, Debug)]
pub struct StartBackupPayload {
    device_id: String,
    hostname: Option<String>,
    inventory_file: Option<String>,
    username: String,
    password: String,
}

/// Main backup handler that coordinates between frontend and Python API
/// 
/// This handler:
/// 1. Receives backup requests from frontend
/// 2. Validates input parameters
/// 3. Generates unique job ID
/// 4. Forwards request to Python API
/// 5. Monitors progress via WebSocket events
/// 6. Returns immediate response to frontend
async fn backup_handler(
    State(state): State<AppState>,
    Json(payload): Json<StartBackupPayload>,
) -> Result<Json<serde_json::Value>, ApiError> {
    info!("🚀 BACKUP HANDLER CALLED for device: {}", payload.device_id);

    // =========================================================================
    // STEP 1: INPUT VALIDATION
    // =========================================================================
    if payload.device_id.trim().is_empty() {
        return Err(ApiError::WebSocketError("Device ID cannot be empty".to_string()));
    }
    if payload.username.trim().is_empty() {
        return Err(ApiError::WebSocketError("Username cannot be empty".to_string()));
    }
    if payload.password.trim().is_empty() {
        return Err(ApiError::WebSocketError("Password cannot be empty".to_string()));
    }

    // =========================================================================
    // STEP 2: JOB INITIALIZATION
    // =========================================================================
    let job_id = Uuid::new_v4().to_string();
    let service_clone = Arc::clone(&state.websocket_service);
    let device_id_clone = payload.device_id.clone();

    info!("✅ Generated job ID: {}", job_id);

    // =========================================================================
    // STEP 3: SEND START EVENT
    // =========================================================================
    let start_event = JobEventPayload {
        job_id: job_id.clone(),
        device: device_id_clone.clone(),
        job_type: "backup".to_string(),
        event_type: "OPERATION_START".to_string(),
        status: "in_progress".to_string(),
        data: serde_json::json!({
            "message": "Backup process initiated successfully",
            "step": 0,
            "total_steps": 12 // Estimated total steps for backup process
        }),
        error: None,
        timestamp: Utc::now(),
    };
    
    service_clone.broadcast_job_event(start_event).await?;
    info!("📡 Start event broadcast for job: {}", job_id);

    // =========================================================================
    // STEP 4: FORWARD TO PYTHON API (BACKGROUND TASK)
    // =========================================================================
    task::spawn(async move {
        info!("🏃 Starting real backup process for job: {}", job_id);
        
        let client = Client::new();
        let python_api_url = "http://python_runner:8000/api/backups/devices";
        
        // Prepare request for Python API
        let backup_request = serde_json::json!({
            "hostname": payload.hostname.unwrap_or_else(|| payload.device_id.clone()),
            "inventory_file": payload.inventory_file.unwrap_or_default(),
            "username": payload.username,
            "password": payload.password
        });

        info!("🔗 Forwarding to Python API: {}", python_api_url);
        info!("📦 Payload: {:?}", backup_request);

        match client.post(python_api_url)
            .json(&backup_request)
            .timeout(Duration::from_secs(120)) // 2-minute timeout
            .send()
            .await {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<serde_json::Value>().await {
                        Ok(result) => {
                            info!("✅ Python API response: {:?}", result);
                            
                            // Send completion event
                            let complete_event = JobEventPayload {
                                job_id: job_id.clone(),
                                device: device_id_clone.clone(),
                                job_type: "backup".to_string(),
                                event_type: "OPERATION_COMPLETE".to_string(),
                                status: "completed".to_string(),
                                data: serde_json::json!({
                                    "message": "Backup completed successfully via Python API",
                                    "result": result,
                                    "step": 12,
                                    "total_steps": 12
                                }),
                                error: None,
                                timestamp: Utc::now(),
                            };
                            
                            service_clone.broadcast_job_event(complete_event).await.ok();
                            info!("🎉 Backup completed successfully for job: {}", job_id);
                        }
                        Err(e) => {
                            error!("❌ Failed to parse Python API response: {}", e);
                            send_error_event(&service_clone, &job_id, &device_id_clone, 
                                &format!("Failed to parse Python API response: {}", e)).await;
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
                    error!("❌ Python API returned error: HTTP {}", response.status());
                    send_error_event(&service_clone, &job_id, &device_id_clone, 
                        &format!("Python API error: HTTP {} - {}", response.status(), error_text)).await;
                }
            }
            Err(e) => {
                error!("❌ Failed to call Python API: {}", e);
                send_error_event(&service_clone, &job_id, &device_id_clone, 
                    &format!("Failed to connect to Python API: {}", e)).await;
            }
        }
    });

    // =========================================================================
    // STEP 5: RETURN IMMEDIATE RESPONSE TO FRONTEND
    // =========================================================================
    info!("📤 Returning immediate response for job: {}", job_id);

    Ok(Json(serde_json::json!({
        "status": "started",
        "message": "Backup process initiated successfully",
        "job_id": job_id,
        "device_id": payload.device_id,
        "timestamp": Utc::now().to_rfc3339()
    })))
}

// =================================================================================================
// SECTION: HELPER FUNCTIONS
// =================================================================================================

/// Helper function to send error events via WebSocket
async fn send_error_event(
    service: &Arc<crate::websocket::WebSocketService>,
    job_id: &str,
    device_id: &str,
    error_msg: &str,
) {
    let error_event = JobEventPayload {
        job_id: job_id.to_string(),
        device: device_id.to_string(),
        job_type: "backup".to_string(),
        event_type: "OPERATION_COMPLETE".to_string(),
        status: "failed".to_string(),
        data: serde_json::json!({
            "message": "Backup process failed",
            "step": 0,
            "total_steps": 12
        }),
        error: Some(error_msg.to_string()),
        timestamp: Utc::now(),
    };
    
    if let Err(e) = service.broadcast_job_event(error_event).await {
        error!("❌ Failed to send error event: {}", e);
    }
}
