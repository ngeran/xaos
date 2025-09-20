// =========================================================================================
// File Path: src/models/mod.rs
// Version: 1.2.0
//
// Description:
// Central module for API data models and error handling. Contains all shared data structures
// and error types used across the application.
//
// Key Sections:
// - API Error Handling: Custom error types and response conversion
// - Navigation Models: UI navigation configuration structures
// - WebSocket Models: Real-time communication structures
//
// Change Log:
// - 1.2.0: Added BadRequest variant to ApiError and implemented From<axum::Error> for ApiError.
// - 1.1.0: Added ExecutionError variant and organized code into logical sections
// - 1.0.0: Initial implementation
// =========================================================================================

use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

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
// SECTION 3: NAVIGATION MODELS
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
// SECTION 4: BACKUP & RESTORE MODELS
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
