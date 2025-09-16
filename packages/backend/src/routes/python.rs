// File Path: src/routes/python.rs
// Version: 1.0.6
// Description: Python execution routes module.
// Updated to work with the new PythonRunnerService interface.
//
// Key Features:
// - Script execution endpoints
// - Status checking and monitoring
// - Execution history and results
// - WebSocket integration for real-time output
// - Comprehensive error handling
// - Security validation for script paths
//
// Usage Guide:
// POST   /api/python/execute       - Execute a Python script
// GET    /api/python/status/:id    - Check execution status
// GET    /api/python/execution/:id - Get full execution details
// GET    /api/python/executions    - List all executions
// DELETE /api/python/execution/:id - Cancel a running execution
//
// Change Log:
// - 1.0.6: Fixed type consistency in get_execution_details
// - 1.0.5: Fixed type mismatches and missing warn import
// - 1.0.4: Fixed return type issues and improved error handling
// - 1.0.3: Fixed ErrorResponse struct syntax
// - 1.0.2: Added comprehensive error handling and validation
// - 1.0.1: Initial route implementation with basic functionality
// - 1.0.0: Module creation and initial structure

use axum::{
    Router,
    routing::{get, post, delete},
    extract::{Path, Query, State},
    response::IntoResponse,
    Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::{info, error, debug, warn};

use crate::AppState;
use crate::services::ExecutionStatus;

// =============================================================================
// SECTION 1: REQUEST AND RESPONSE TYPES
// =============================================================================
// Defines data structures for API requests and responses

/// Request payload for Python script execution
#[derive(Debug, Deserialize)]
pub struct ExecutePythonRequest {
    /// Script path relative to python_pipeline directory
    /// Example: "tools/backup_and_restore/backup.py"
    pub script_path: String,

    /// Command line arguments for the script
    /// Example: ["--database", "production"]
    #[serde(default)]
    pub args: Vec<String>,

    /// Environment variables for the execution
    /// Example: {"ENV": "production", "DEBUG": "false"}
    #[serde(default)]
    pub env_vars: HashMap<String, String>,

    /// Optional WebSocket client ID for real-time output streaming
    /// If provided, execution output will be streamed via WebSocket
    pub websocket_client_id: Option<String>,
}

/// Execution response containing execution ID and status
#[derive(Debug, Serialize)]
pub struct ExecutePythonResponse {
    /// Unique identifier for the execution
    /// Used to track status and retrieve results
    pub execution_id: String,
    
    /// Current status of the execution
    /// Values: "pending", "running", "completed", "failed", "cancelled", "timedout"
    pub status: String,
    
    /// Human-readable message about the execution state
    pub message: String,
}

/// Query parameters for listing executions with filtering
#[derive(Debug, Deserialize)]
pub struct ListExecutionsQuery {
    /// Optional status filter to limit results
    /// Example: "running", "completed", "failed"
    pub status: Option<String>,
    
    /// Optional limit on number of results to return
    /// Example: 10, 25, 50
    pub limit: Option<usize>,
}

/// Standard error response format for API errors
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    /// Error type or category for client handling
    /// Example: "Invalid request", "Execution not found", "Failed to execute script"
    pub error: String,
    
    /// Detailed error information for debugging (optional)
    /// Example: "Script path cannot be empty", "Path traversal not allowed"
    pub details: Option<String>,
}

// =============================================================================
// SECTION 2: ROUTE HANDLERS
// =============================================================================
// Implementation of route handlers for Python execution endpoints

/// Execute a Python script
async fn execute_python_script(
    State(state): State<AppState>,
    Json(request): Json<ExecutePythonRequest>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    info!("Python execution request: {}", request.script_path);

    // ========================================================================
    // INPUT VALIDATION
    // ========================================================================

    // Validate script path is not empty
    if request.script_path.is_empty() {
        error!("Empty script path provided");
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid request".to_string(),
                details: Some("Script path cannot be empty".to_string()),
            }),
        ));
    }

    // Security: prevent path traversal attacks
    if request.script_path.contains("..") {
        error!("Path traversal attempt detected: {}", request.script_path);
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid script path".to_string(),
                details: Some("Path traversal not allowed".to_string()),
            }),
        ));
    }

    // ========================================================================
    // EXECUTION PROCESSING
    // ========================================================================

    // Execute the script through the Python runner service
    match state.python_runner_service.execute_script(
        &request.script_path,
        request.args,
        request.env_vars,
        request.websocket_client_id,
    ).await {
        Ok(execution_id) => {
            info!("Script execution started successfully: {}", execution_id);

            // Return success response with execution details
            Ok((
                StatusCode::ACCEPTED,
                Json(ExecutePythonResponse {
                    execution_id,
                    status: "pending".to_string(),
                    message: "Script execution started".to_string(),
                }),
            ))
        }
        Err(e) => {
            error!("Failed to execute script {}: {}", request.script_path, e);

            // Return error response with details
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "Failed to execute script".to_string(),
                    details: Some(e.to_string()),
                }),
            ))
        }
    }
}

/// Get execution status
async fn get_execution_status(
    State(state): State<AppState>,
    Path(execution_id): Path<String>,
) -> impl IntoResponse {
    debug!("Getting status for execution: {}", execution_id);

    match state.python_runner_service.get_execution_status(&execution_id).await {
        Ok(status) => {
            debug!("Execution status retrieved: {} - {:?}", execution_id, status);
            
            // Return execution status
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "execution_id": execution_id,
                    "status": status,
                })),
            )
        }
        Err(_) => {
            warn!("Execution not found: {}", execution_id);
            
            // Return not found error using the same Json type for consistency
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Execution not found",
                    "execution_id": execution_id,
                })),
            )
        }
    }
}

/// Get full execution details
async fn get_execution_details(
    State(state): State<AppState>,
    Path(execution_id): Path<String>,
) -> impl IntoResponse {
    debug!("Getting details for execution: {}", execution_id);

    // Use a consistent response type for both success and error cases
    match state.python_runner_service.get_execution(&execution_id).await {
        Ok(execution) => {
            debug!("Execution details retrieved: {}", execution_id);
            
            // Return complete execution details as JSON value for consistency
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "execution": execution,
                    "status": "success"
                })),
            )
        }
        Err(_) => {
            warn!("Execution not found: {}", execution_id);
            
            // Return not found error using the same Json type for consistency
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Execution not found",
                    "execution_id": execution_id,
                    "status": "error"
                })),
            )
        }
    }
}

/// List executions with optional filtering
async fn list_executions(
    State(state): State<AppState>,
    Query(params): Query<ListExecutionsQuery>,
) -> impl IntoResponse {
    debug!("Listing executions with filter: {:?}", params);

    // Parse status filter from query parameter
    let status_filter = params.status.and_then(|s| {
        match s.to_lowercase().as_str() {
            "pending" => Some(ExecutionStatus::Pending),
            "running" => Some(ExecutionStatus::Running),
            "completed" => Some(ExecutionStatus::Completed),
            "failed" => Some(ExecutionStatus::Failed),
            "cancelled" => Some(ExecutionStatus::Cancelled),
            "timedout" => Some(ExecutionStatus::TimedOut),
            _ => None,
        }
    });

    // Retrieve filtered executions from service
    let executions = state.python_runner_service.list_executions(
        status_filter,
        params.limit,
    ).await;

    debug!("Returning {} executions", executions.len());
    
    // Return list of executions
    (StatusCode::OK, Json(executions))
}

/// Cancel a running execution
async fn cancel_execution(
    State(state): State<AppState>,
    Path(execution_id): Path<String>,
) -> impl IntoResponse {
    info!("Cancelling execution: {}", execution_id);

    match state.python_runner_service.cancel_execution(&execution_id).await {
        Ok(()) => {
            info!("Execution cancelled successfully: {}", execution_id);
            
            // Return success response
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "execution_id": execution_id,
                    "status": "cancelled",
                    "message": "Execution cancelled successfully",
                })),
            )
        }
        Err(e) => {
            error!("Failed to cancel execution {}: {}", execution_id, e);
            
            // Return error response using the same Json type for consistency
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Failed to cancel execution",
                    "execution_id": execution_id,
                    "details": e.to_string(),
                })),
            )
        }
    }
}

// =============================================================================
// SECTION 3: ROUTE CONFIGURATION
// =============================================================================
// Route configuration and setup

/// Creates and returns all Python-related routes
///
/// # Returns
/// Router configured with all Python execution endpoints
///
/// # Routes Configured
/// - POST   /api/python/execute       - Execute Python script
/// - GET    /api/python/status/:id    - Get execution status
/// - GET    /api/python/execution/:id - Get execution details
/// - GET    /api/python/executions    - List executions
/// - DELETE /api/python/execution/:id - Cancel execution
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/python/execute", post(execute_python_script))
        .route("/api/python/status/:id", get(get_execution_status))
        .route("/api/python/execution/:id", get(get_execution_details))
        .route("/api/python/executions", get(list_executions))
        .route("/api/python/execution/:id", delete(cancel_execution))
}
