// File: backend/src/models/websocket.rs
// Version: 3.0.3
// Key Features:
// - Added REQUEST_CONNECTION_INFO and REQUEST_ACTIVE_CONNECTIONS message types
// - Fixed message type consistency between frontend and backend
// - Ensure proper Pong message serialization format
// - FIXED: toString typo changed to to_string
//
// How to Guide:
// 1. Frontend should send REQUEST_CONNECTION_INFO to get connection details
// 2. Frontend should send REQUEST_ACTIVE_CONNECTIONS to get connection stats
// 3. Backend responds with CONNECTION_INFO and ACTIVE_CONNECTIONS respectively
// 4. Pong messages are serialized as {type: "Pong"} for frontend compatibility

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use uuid::Uuid;
use chrono::{DateTime, Utc};

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION TYPES AND IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════════

/// Unique identifier for WebSocket connections
pub type ConnectionId = Uuid;

// ═══════════════════════════════════════════════════════════════════════════════════
// DEBUG CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════

/// Debug configuration for WebSocket service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugConfig {
    pub enabled: bool,
    pub log_messages: bool,
    pub log_connections: bool,
    pub log_performance: bool,
    pub save_to_file: bool,
    pub max_log_size: usize,
}

impl Default for DebugConfig {
    fn default() -> Self {
        Self {
            enabled: std::env::var("WEBSOCKET_DEBUG")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
            log_messages: true,
            log_connections: true,
            log_performance: true,
            save_to_file: false,
            max_log_size: 10_000,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// WEBSOCKET MESSAGE ENUM
// ═══════════════════════════════════════════════════════════════════════════════════

/// WebSocket message types with consistent structure
/// Frontend compatibility: {type: string, payload?: any}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    // Connection management
    #[serde(rename = "CONNECTION_INFO")]
    ConnectionInfo {
        #[serde(flatten)]
        payload: ConnectionDetails,
    },

    // FIXED: Added request message types for frontend to backend communication
    #[serde(rename = "REQUEST_CONNECTION_INFO")]
    RequestConnectionInfo,

    #[serde(rename = "REQUEST_ACTIVE_CONNECTIONS")]
    RequestActiveConnections,

    // FIXED: Ensure Ping/Pong use exact casing expected by frontend
    #[serde(rename = "Ping")]
    Ping,

    #[serde(rename = "Pong")]
    Pong,

    // Subscription management - matches frontend format
    #[serde(rename = "Subscribe")]
    Subscribe {
        payload: SubscribePayload,
    },

    #[serde(rename = "Unsubscribe")]
    Unsubscribe {
        payload: UnsubscribePayload,
    },

    // Status and metrics
    #[serde(rename = "ACTIVE_CONNECTIONS")]
    ActiveConnections {
        payload: ConnectionStats,
    },

    // Navigation and file system
    #[serde(rename = "NavigationUpdated")]
    NavigationUpdated {
        payload: NavigationPayload,
    },

    // Data updates
    #[serde(rename = "DataUpdate")]
    DataUpdate {
        payload: DataUpdatePayload,
    },

    // Debug messages
    #[serde(rename = "Debug")]
    Debug {
        payload: DebugPayload,
    },

    // Error handling
    #[serde(rename = "Error")]
    Error {
        payload: ErrorPayload,
    },

    // Custom events
    #[serde(rename = "Custom")]
    Custom {
        event: String,
        payload: serde_json::Value,
    },
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MESSAGE PAYLOAD STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionDetails {
    pub connection_id: ConnectionId,
    pub ip: String,
    #[serde(rename = "connectedAt")]
    pub connected_at: DateTime<Utc>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscribePayload {
    pub topics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnsubscribePayload {
    pub topics: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStats {
    pub count: usize,
    pub connections: Vec<ConnectionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionSummary {
    pub id: ConnectionId,
    pub ip: String,
    pub connected_duration: i64, // seconds
    pub message_count: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationPayload {
    pub schema: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangePayload {
    pub path: String,
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataUpdatePayload {
    pub source: String,
    pub data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebugPayload {
    pub level: String,
    pub component: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub message: String,
    pub code: Option<u16>,
    pub details: Option<String>,
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION INFO WITH METRICS
// ═══════════════════════════════════════════════════════════════════════════════════

/// Enhanced connection information with metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionInfo {
    pub id: ConnectionId,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub last_ping: Option<DateTime<Utc>>,
    pub subscriptions: Vec<String>,
    pub metadata: HashMap<String, String>,
    pub remote_addr: Option<SocketAddr>,
    pub user_agent: Option<String>,
    // Metrics
    pub messages_sent: u64,
    pub messages_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub ping_latency_ms: Option<u64>,
}

impl ConnectionInfo {
    /// Create new connection with remote address
    pub fn new_with_addr(remote_addr: Option<SocketAddr>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            connected_at: now,
            last_activity: now,
            last_ping: None,
            subscriptions: Vec::new(),
            metadata: HashMap::new(),
            remote_addr,
            user_agent: None,
            messages_sent: 0,
            messages_received: 0,
            bytes_sent: 0,
            bytes_received: 0,
            ping_latency_ms: None,
        }
    }

    /// Update activity timestamp
    pub fn update_activity(&mut self) {
        self.last_activity = Utc::now();
    }

    /// Record message sent
    pub fn record_sent(&mut self, bytes: usize) {
        self.messages_sent += 1;
        self.bytes_sent += bytes as u64;
        self.update_activity();
    }

    /// Record message received
    pub fn record_received(&mut self, bytes: usize) {
        self.messages_received += 1;
        self.bytes_received += bytes as u64;
        self.update_activity();
    }

    /// Check if connection is stale
    pub fn is_stale(&self, timeout: std::time::Duration) -> bool {
        let now = Utc::now();
        now.signed_duration_since(self.last_activity)
            .to_std()
            .unwrap_or_default() > timeout
    }

    /// Get connection summary for stats
    pub fn to_summary(&self) -> ConnectionSummary {
        let duration = Utc::now()
            .signed_duration_since(self.connected_at)
            .num_seconds();

        ConnectionSummary {
            id: self.id,
            ip: self.remote_addr
                .map(|addr| addr.ip().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
            connected_duration: duration,
            message_count: self.messages_sent + self.messages_received,
            bytes_sent: self.bytes_sent,
            bytes_received: self.bytes_received,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION TOPICS
// ═══════════════════════════════════════════════════════════════════════════════════

/// Subscription topics for message routing
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SubscriptionTopic {
    Navigation,
    FileSystem,
    DataUpdates(String),
    Debug,
    Metrics,
    All,
    Direct(ConnectionId),
}

impl ToString for SubscriptionTopic {
    fn to_string(&self) -> String {
        match self {
            Self::Navigation => "navigation".to_string(),
            // FIXED: Changed toString to to_string
            Self::FileSystem => "filesystem".to_string(),
            Self::DataUpdates(source) => format!("data:{}", source),
            Self::Debug => "debug".to_string(),
            Self::Metrics => "metrics".to_string(),
            Self::All => "all".to_string(),
            Self::Direct(id) => format!("direct:{}", id),
        }
    }
}

impl From<&str> for SubscriptionTopic {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "navigation" => Self::Navigation,
            "filesystem" => Self::FileSystem,
            "debug" => Self::Debug,
            "metrics" => Self::Metrics,
            "all" => Self::All,
            s if s.starts_with("data:") => {
                Self::DataUpdates(s.strip_prefix("data:").unwrap_or("").to_string())
            }
            s if s.starts_with("direct:") => {
                if let Ok(uuid) = Uuid::parse_str(s.strip_prefix("direct:").unwrap_or("")) {
                    Self::Direct(uuid)
                } else {
                    Self::All
                }
            }
            _ => Self::All,
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SERVICE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════

/// WebSocket service configuration with debug options
#[derive(Debug, Clone)]
pub struct WsConfig {
    pub ping_interval: std::time::Duration,
    pub connection_timeout: std::time::Duration,
    pub max_connections: usize,
    pub buffer_size: Option<usize>,
    pub debug: DebugConfig,
    pub collect_metrics: bool,
    pub max_message_size: usize,
}

impl Default for WsConfig {
    fn default() -> Self {
        Self {
            ping_interval: std::time::Duration::from_secs(30),
            connection_timeout: std::time::Duration::from_secs(300),
            max_connections: 1000,
            buffer_size: Some(1024 * 64),
            debug: DebugConfig::default(),
            collect_metrics: true,
            max_message_size: 1024 * 1024, // 1MB
        }
    }
}
