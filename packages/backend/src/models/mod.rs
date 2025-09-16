// backend/src/models/mod.rs
use axum::{
    response::{IntoResponse, Response},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};

pub mod websocket;

pub type ApiResult<T> = Result<T, ApiError>;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("YAML parsing error: {0}")]
    YamlParseError(String),
    
    #[error("File not found: {0}")]
    FileNotFound(String),
    
    #[error("Not found: {0}")]  // Add this variant
    NotFound(String),
    
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
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            ApiError::YamlParseError(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::FileNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            ApiError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),  // Add this match
            ApiError::IoError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
            ApiError::SerializationError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Serialization failed".to_string()),
            ApiError::DeserializationError(_) => (StatusCode::BAD_REQUEST, "Invalid request format".to_string()),
            ApiError::WebSocketError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "WebSocket error".to_string()),
            ApiError::ValidationError(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            ApiError::InternalError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string()),
        };

        let body = serde_json::json!({
            "error": error_message,
            "status": status.as_u16()
        });

        (status, axum::Json(body)).into_response()
    }
}


// Navigation-specific models (if you have them)
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
