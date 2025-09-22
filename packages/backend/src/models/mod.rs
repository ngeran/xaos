// =========================================================================================
// File Path: src/models/mod.rs
// Version: 1.3.0
//
// Description:
// Central module for API data models and error handling. Contains all shared data structures
// and error types used across the application.
//
// Key Sections:
// - API Error Handling: Custom error types and response conversion
// - Navigation Models: UI navigation configuration structures
// - WebSocket Models: Real-time communication structures
// - Job Event Models: Real-time job progress tracking structures
//
// Change Log:
// - 1.3.0: Added JobEvent models for real-time job progress tracking
// - 1.2.0: Added BadRequest variant to ApiError and implemented From<axum::Error> for ApiError.
// - 1.1.0: Added ExecutionError variant and organized code into logical sections
// - 1.0.0: Initial implementation
// =========================================================================================

use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// =========================================================================================
// SECTION 1: WEB SOCKET MODELS
// =========================================================================================

pub mod websocket;

// =========================================================================================
// SECTION 2: API ERROR HANDLING
// Custom error types and response conversion for unified error handling
// =========================================================================================

pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("YAML parsing error: {0}")]
    YamlParseError(String),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Bad request: {0}")]
    BadRequest(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
    
    #[error("WebSocket error: {0}")]
    WebSocketError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
    
    #[error("Internal server error: {0}")]
    InternalError(String),
    
    #[error("Execution error: {0}")]
    ExecutionError(String),
    
    #[error("Job execution error: {0}")]
    JobExecutionError(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            ApiError::YamlParseError(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::FileNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            ApiError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            ApiError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::IoError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
            ApiError::SerializationError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Serialization failed".to_string()),
            ApiError::DeserializationError(_) => (StatusCode::BAD_REQUEST, "Invalid request format".to_string()),
            ApiError::WebSocketError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "WebSocket error".to_string()),
            ApiError::ValidationError(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::InternalError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
            ApiError::ExecutionError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            ApiError::JobExecutionError(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = serde_json::json!({
            "error": error_message,
            "status": status.as_u16()
        });

        (status, axum::Json(body)).into_response()
    }
}

// Implement the From trait for `axum::Error` to `ApiError`
impl From<axum::Error> for ApiError {
    fn from(inner: axum::Error) -> Self {
        ApiError::ExecutionError(inner.to_string())
    }
}

// =========================================================================================
// SECTION 3: JOB EVENT MODELS
// Real-time job progress tracking structures for device operations
// =========================================================================================

/// Standardized job event for real-time progress tracking across all device operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobEvent {
    /// Unique identifier for the job instance
    pub job_id: String,
    /// Device hostname or identifier
    pub device: String,
    /// Type of job: backup, restore, validation, upgrade, etc.
    pub job_type: String,
    /// Event type: started, progress, completed, failed, etc.
    pub event_type: String,
    /// Current status: queued, in_progress, completed, failed
    pub status: String,
    /// ISO 8601 timestamp of the event
    pub timestamp: DateTime<Utc>,
    /// Job-specific data and progress details
    pub data: serde_json::Value,
    /// Optional error information for failed jobs
    pub error: Option<String>,
}

impl JobEvent {
    /// Create a new job event with current timestamp
    pub fn new(job_id: &str, device: &str, job_type: &str, event_type: &str, status: &str, data: serde_json::Value) -> Self {
        Self {
            job_id: job_id.to_string(),
            device: device.to_string(),
            job_type: job_type.to_string(),
            event_type: event_type.to_string(),
            status: status.to_string(),
            timestamp: Utc::now(),
            data,
            error: None,
        }
    }
    
    /// Create a job event with error information
    pub fn with_error(job_id: &str, device: &str, job_type: &str, error: &str, data: serde_json::Value) -> Self {
        Self {
            job_id: job_id.to_string(),
            device: device.to_string(),
            job_type: job_type.to_string(),
            event_type: "failed".to_string(),
            status: "failed".to_string(),
            timestamp: Utc::now(),
            data,
            error: Some(error.to_string()),
        }
    }
}

/// Request structure for subscribing to job events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSubscriptionRequest {
    /// Optional device filter to receive events only for specific devices
    pub device_filter: Option<String>,
    /// Optional job type filter (backup, restore, etc.)
    pub job_type_filter: Option<String>,
}

/// Response structure for job subscription confirmation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobSubscriptionResponse {
    /// Subscription ID for managing subscriptions
    pub subscription_id: String,
    /// List of topics subscribed to
    pub topics: Vec<String>,
}

// =========================================================================================
// SECTION 4: NAVIGATION MODELS
// UI navigation configuration structures for sidebar and menu management
// =========================================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationConfig {
    pub items: Vec<NavigationItem>,
    pub settings: Option<NavigationSettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationItem {
    pub id: String,
    pub label: String,
    pub icon: Option<String>,
    pub path: Option<String>,
    pub children: Option<Vec<NavigationItem>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationSettings {
    pub theme: Option<String>,
    pub layout: Option<String>,
    pub collapsible: Option<bool>,
}

// =========================================================================================
// SECTION 5: BACKUP & RESTORE MODELS
// Data structures for backup and restore operations
// =========================================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupRequest {
    pub hostname: String,
    pub username: String,
    pub password: String,
    pub inventory_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupResponse {
    pub status: String,
    pub message: String,
    pub logs: Option<String>,
    pub files: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreRequest {
    pub hostname: String,
    pub username: String,
    pub password: String,
    pub backup_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreResponse {
    pub status: String,
    pub message: String,
    pub logs: Option<String>,
}
