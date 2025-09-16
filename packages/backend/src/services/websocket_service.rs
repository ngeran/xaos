// File: backend/src/services/websocket_service.rs
// Version: 3.0.6
// Key Features:
// - Enhanced Pong response handling with proper formatting
// - Added dedicated pong response method
// - Improved debugging for ping/pong operations
// - Fixed connection timing to prevent premature timeouts
//
// How to Guide:
// 1. Backend responds to Ping with properly formatted Pong messages
// 2. Enhanced debugging shows detailed ping/pong timing
// 3. Fixed connection timing to prevent premature timeouts

use axum::extract::ws::{Message, WebSocket};
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc,
    },
    net::SocketAddr,
    time::Instant,
};
use tokio::sync::{broadcast, mpsc, Mutex, RwLock};
use tracing::{error, info, instrument, warn, debug};
use chrono::Utc;

use crate::models::{
    websocket::{
        ConnectionId, SubscriptionTopic, WsConfig, WsMessage, ConnectionInfo,
        ConnectionDetails, ConnectionStats, DebugPayload,
    },
    ApiError,
};

// ═══════════════════════════════════════════════════════════════════════════════════
// ENHANCED SERVICE STRUCT WITH DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════════

/// Enhanced WebSocket service with debugging capabilities
#[derive(Debug)]
pub struct WebSocketService {
    /// Thread-safe connection registry
    connections: Arc<RwLock<HashMap<ConnectionId, ConnectionInfoWithSender>>>,
    /// Message broadcaster (reserved for future use)
    #[allow(dead_code)]
    broadcaster: broadcast::Sender<(SubscriptionTopic, WsMessage)>,
    /// Active connection counter
    connection_count: Arc<AtomicUsize>,
    /// Service configuration
    config: Arc<RwLock<WsConfig>>,
    /// Debug mode flag
    debug_enabled: Arc<AtomicBool>,
    /// Debug log storage
    debug_logs: Arc<RwLock<Vec<DebugPayload>>>,
    /// Performance metrics
    metrics: Arc<RwLock<ServiceMetrics>>,
}

/// Internal connection wrapper with sender
#[derive(Debug)]
struct ConnectionInfoWithSender {
    pub info: ConnectionInfo,
    pub sender: Mutex<mpsc::Sender<Message>>,
    pub ping_sent_at: Mutex<Option<Instant>>,
}

/// Service-wide metrics
#[derive(Debug, Clone, Default, serde::Serialize)]
struct ServiceMetrics {
    pub total_connections: u64,
    pub total_messages_sent: u64,
    pub total_messages_received: u64,
    pub total_bytes_sent: u64,
    pub total_bytes_received: u64,
    pub avg_ping_latency_ms: f64,
    pub peak_connections: usize,
    pub errors_count: u64,
    pub started_at: Option<chrono::DateTime<chrono::Utc>>,
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SERVICE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════════

impl WebSocketService {
    /// Create new service with debug capabilities
    #[instrument(name = "websocket_service_new", level = "info")]
    pub fn new(config: Option<WsConfig>) -> Self {
        let config = config.unwrap_or_default();
        let debug_enabled = config.debug.enabled;
        let (tx, _rx) = broadcast::channel(config.buffer_size.unwrap_or(1000));

        info!(
            debug_mode = debug_enabled,
            max_connections = config.max_connections,
            ping_interval = ?config.ping_interval,
            "Initializing enhanced WebSocket service"
        );

        let mut metrics = ServiceMetrics::default();
        metrics.started_at = Some(Utc::now());

        let service = Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            broadcaster: tx,
            connection_count: Arc::new(AtomicUsize::new(0)),
            config: Arc::new(RwLock::new(config)),
            debug_enabled: Arc::new(AtomicBool::new(debug_enabled)),
            debug_logs: Arc::new(RwLock::new(Vec::new())),
            metrics: Arc::new(RwLock::new(metrics)),
        };

        if debug_enabled {
            info!("WebSocket service started in DEBUG mode");
        }

        service
    }

    /// Toggle debug mode at runtime
    pub async fn toggle_debug(&self) -> bool {
        let current = self.debug_enabled.load(Ordering::Relaxed);
        let new_state = !current;
        self.debug_enabled.store(new_state, Ordering::Relaxed);

        // Update config
        let mut config = self.config.write().await;
        config.debug.enabled = new_state;

        self.log_debug(
            "info",
            "DebugToggle",
            &format!("Debug mode {}", if new_state { "enabled" } else { "disabled" }),
            None,
        ).await;

        info!("Debug mode toggled to: {}", new_state);
        new_state
    }

    /// Log debug message
    async fn log_debug(&self, level: &str, component: &str, message: &str, data: Option<serde_json::Value>) {
        if !self.debug_enabled.load(Ordering::Relaxed) {
            return;
        }

        let debug_msg = DebugPayload {
            level: level.to_string(),
            component: component.to_string(),
            message: message.to_string(),
            data,
            timestamp: Utc::now(),
        };

        // Store in memory
        let mut logs = self.debug_logs.write().await;
        logs.push(debug_msg.clone());

        // Limit log size
        let config = self.config.read().await;
        if logs.len() > config.debug.max_log_size {
            logs.drain(0..100); // Remove oldest 100 entries
        }
        drop(logs);
        drop(config);

        // Broadcast to debug subscribers
        let ws_msg = WsMessage::Debug { payload: debug_msg };
        let _ = self.broadcast_to_topic(&SubscriptionTopic::Debug, ws_msg).await;
    }

    /// Get debug logs
    pub async fn get_debug_logs(&self) -> Vec<DebugPayload> {
        self.debug_logs.read().await.clone()
    }

    /// Clear debug logs
    pub async fn clear_debug_logs(&self) {
        self.debug_logs.write().await.clear();
        self.log_debug("info", "Debug", "Debug logs cleared", None).await;
    }

    /// Get service metrics
    pub async fn get_metrics(&self) -> serde_json::Value {
        let metrics = self.metrics.read().await.clone();
        let connections = self.connections.read().await;
        let active_connections = connections.len();

        serde_json::json!({
            "service_metrics": metrics,
            "active_connections": active_connections,
            "debug_enabled": self.debug_enabled.load(Ordering::Relaxed),
            "debug_log_count": self.debug_logs.read().await.len(),
        })
    }

    /// Get service stats (alias for get_metrics for backward compatibility)
    pub async fn get_service_stats(&self) -> serde_json::Value {
        self.get_metrics().await
    }

    /// Send Pong response with proper format
    /// FIXED: Ensure Pong response has consistent format expected by frontend
    async fn send_pong_response(&self, connection_id: ConnectionId) -> Result<(), ApiError> {
        // Create properly formatted Pong response
        let pong_message = WsMessage::Pong;
        
        let msg_text = serde_json::to_string(&pong_message)
            .map_err(|e| ApiError::SerializationError(e.to_string()))?;

        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(&connection_id) {
            conn.sender.lock().await
                .send(Message::Text(msg_text))
                .await
                .map_err(|e| ApiError::WebSocketError(e.to_string()))?;

            debug!("Pong response sent to {}", connection_id);
            Ok(())
        } else {
            warn!("Connection not found for pong response: {}", connection_id);
            Err(ApiError::WebSocketError("Connection not found".to_string()))
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// CONNECTION HANDLING WITH METRICS AND DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════════

impl WebSocketService {
    /// Handle new connection with IP tracking
    #[instrument(name = "handle_connection", level = "info", skip(self, socket))]
    pub async fn handle_connection(
        self: Arc<Self>,
        socket: WebSocket,
        remote_addr: Option<SocketAddr>,
    ) -> Result<(), ApiError> {
        info!("Handling WebSocket connection from {:?}", remote_addr);
        
        let current_count = self.connection_count.load(Ordering::Relaxed);
        let config = self.config.read().await;

        // Check limits
        if current_count >= config.max_connections {
            error!(
                current = current_count,
                max = config.max_connections,
                "Connection rejected: limit reached"
            );

            self.log_debug(
                "error",
                "Connection",
                &format!("Connection rejected: limit {} reached", config.max_connections),
                None,
            ).await;

            return Err(ApiError::WebSocketError("Maximum connections reached".to_string()));
        }
        drop(config);

        let (ws_sender, ws_receiver) = socket.split();
        debug!("Socket split successful");

        let (tx, rx) = mpsc::channel(100);
        debug!("Channel created with capacity 100");

        let connection_info = ConnectionInfo::new_with_addr(remote_addr);
        let connection_id = connection_info.id;
        info!("Connection ID generated: {}", connection_id);

        // Create connection wrapper
        let connection_wrapper = ConnectionInfoWithSender {
            info: connection_info.clone(),
            sender: Mutex::new(tx),
            ping_sent_at: Mutex::new(None),
        };

        // Update metrics
        self.connection_count.fetch_add(1, Ordering::Relaxed);
        {
            let mut metrics = self.metrics.write().await;
            metrics.total_connections += 1;
            let current = self.connection_count.load(Ordering::Relaxed);
            if current > metrics.peak_connections {
                metrics.peak_connections = current;
            }
        }
        debug!("Metrics updated");

        // Register connection
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id, connection_wrapper);
            info!("Connection registered: {}", connection_id);
        }

        // Send connection info to client
        let connection_details = ConnectionDetails {
            connection_id,
            ip: remote_addr
                .map(|addr| addr.ip().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
            connected_at: connection_info.connected_at,
            user_agent: None,
        };

        let welcome_msg = WsMessage::ConnectionInfo {
            payload: connection_details,
        };

        info!("Sending welcome message to connection {}", connection_id);
        
        // Spawn handler task
        let service = Arc::clone(&self);
        tokio::spawn(async move {
            let span = tracing::info_span!(
                "connection_handler",
                connection_id = %connection_id,
                remote_addr = ?remote_addr
            );
            let _enter = span.enter();

            info!("Starting connection handler for {}", connection_id);
            
            match service.handle_socket(
                ws_sender,
                ws_receiver,
                rx,
                connection_id,
                welcome_msg,
            ).await {
                Ok(()) => {
                    info!("Connection handler completed for {}", connection_id);
                }
                Err(e) => {
                    error!(error = %e, "Connection error for {}", connection_id);
                    let mut metrics = service.metrics.write().await;
                    metrics.errors_count += 1;
                }
            }

            service.cleanup_connection(connection_id).await;
        });

        // Broadcast active connections update
        self.broadcast_connection_stats().await;
        info!("Connection stats broadcasted");

        Ok(())
    }

    /// Handle socket with metrics tracking
    #[instrument(name = "handle_socket", level = "info", skip(self, ws_sender, ws_receiver, rx, welcome_msg))]
    async fn handle_socket(
        &self,
        mut ws_sender: SplitSink<WebSocket, Message>,
        mut ws_receiver: SplitStream<WebSocket>,
        mut rx: mpsc::Receiver<Message>,
        connection_id: ConnectionId,
        welcome_msg: WsMessage,
    ) -> Result<(), ApiError> {
        // Send welcome message
        let welcome_json = serde_json::to_string(&welcome_msg)
            .map_err(|e| {
                error!("Failed to serialize welcome message: {}", e);
                ApiError::SerializationError(e.to_string())
            })?;

        debug!("Sending welcome message: {}", welcome_json);
        if let Err(e) = ws_sender.send(Message::Text(welcome_json.clone())).await {
            error!("Failed to send welcome: {}", e);
            return Err(ApiError::WebSocketError(format!("Welcome failed: {}", e)));
        }

        // Track sent message
        {
            let mut connections = self.connections.write().await;
            if let Some(conn) = connections.get_mut(&connection_id) {
                conn.info.record_sent(welcome_json.len());
            }
        }

        self.log_debug(
            "verbose",
            "Socket",
            &format!("Welcome sent to {}", connection_id),
            None,
        ).await;

        info!("WebSocket connection established with {}", connection_id);

        // Message loop
        loop {
            tokio::select! {
                // Incoming messages
                msg = ws_receiver.next() => {
                    match msg {
                        Some(Ok(Message::Text(text))) => {
                            debug!("Received message from {}: {} bytes", connection_id, text.len());
                            
                            // Track received
                            {
                                let mut connections = self.connections.write().await;
                                if let Some(conn) = connections.get_mut(&connection_id) {
                                    conn.info.record_received(text.len());
                                }

                                let mut metrics = self.metrics.write().await;
                                metrics.total_messages_received += 1;
                                metrics.total_bytes_received += text.len() as u64;
                            }

                            if let Err(e) = self.handle_incoming_message(&text, connection_id).await {
                                warn!("Message handling error: {}", e);
                                self.log_debug(
                                    "warn",
                                    "Message",
                                    &format!("Failed to handle message: {}", e),
                                    Some(serde_json::json!({"raw": text})),
                                ).await;
                            }
                        }
                        Some(Ok(Message::Ping(data))) => {
                            debug!("Received ping from {}", connection_id);
                            let _ = ws_sender.send(Message::Pong(data)).await;
                        }
                        Some(Ok(Message::Close(_))) => {
                            info!("Client {} closed connection", connection_id);
                            break;
                        }
                        Some(Err(e)) => {
                            error!("WebSocket error from {}: {}", connection_id, e);
                            break;
                        }
                        None => {
                            warn!("Stream ended for {}", connection_id);
                            break;
                        }
                        _ => {
                            debug!("Received other message type from {}", connection_id);
                        }
                    }
                }
                // Outgoing messages
                Some(msg) = rx.recv() => {
                    if let Message::Text(ref text) = msg {
                        debug!("Sending message to {}: {} bytes", connection_id, text.len());
                        
                        // Track sent
                        let mut connections = self.connections.write().await;
                        if let Some(conn) = connections.get_mut(&connection_id) {
                            conn.info.record_sent(text.len());
                        }

                        let mut metrics = self.metrics.write().await;
                        metrics.total_messages_sent += 1;
                        metrics.total_bytes_sent += text.len() as u64;
                    }

                    if let Err(e) = ws_sender.send(msg).await {
                        error!("Failed to send to {}: {}", connection_id, e);
                        break;
                    }
                }
            }
        }

        info!("WebSocket handler terminating for {}", connection_id);
        Ok(())
    }

    /// Broadcast connection statistics
    async fn broadcast_connection_stats(&self) {
        let connections = self.connections.read().await;
        let summaries: Vec<_> = connections
            .values()
            .map(|c| c.info.to_summary())
            .collect();

        let stats = ConnectionStats {
            count: connections.len(),
            connections: summaries,
        };

        let msg = WsMessage::ActiveConnections { payload: stats };
        if let Err(e) = self.broadcast_to_all(msg).await {
            warn!("Failed to broadcast connection stats: {}", e);
        }
    }

    /// Clean up connection
    #[instrument(name = "cleanup_connection", level = "info")]
    pub async fn cleanup_connection(&self, connection_id: ConnectionId) {
        let removed = {
            let mut connections = self.connections.write().await;
            connections.remove(&connection_id)
        };

        if removed.is_some() {
            self.connection_count.fetch_sub(1, Ordering::Relaxed);

            self.log_debug(
                "info",
                "Cleanup",
                &format!("Connection {} cleaned up", connection_id),
                None,
            ).await;

            info!("Connection {} removed", connection_id);

            // Update active connections
            self.broadcast_connection_stats().await;
        } else {
            debug!("Connection {} not found during cleanup", connection_id);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLING WITH VALIDATION AND DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════════

impl WebSocketService {
    /// Handle incoming message with validation
    #[instrument(name = "handle_incoming_message", level = "info", skip(self, text))]
    async fn handle_incoming_message(
        &self,
        text: &str,
        connection_id: ConnectionId,
    ) -> Result<(), ApiError> {
        // Check message size
        let config = self.config.read().await;
        if text.len() > config.max_message_size {
            return Err(ApiError::WebSocketError("Message too large".to_string()));
        }
        drop(config);

        self.log_debug(
            "verbose",
            "Message",
            &format!("Received from {}: {} bytes", connection_id, text.len()),
            None,
        ).await;

        // Parse message
        let message: WsMessage = serde_json::from_str(text)
            .map_err(|e| {
                error!("Parse error from {}: {}", connection_id, e);
                ApiError::DeserializationError(e.to_string())
            })?;

        match message {
            WsMessage::Ping => {
                debug!("Ping received from {}", connection_id);
                // Record ping time
                {
                    let connections = self.connections.read().await;
                    if let Some(conn) = connections.get(&connection_id) {
                        *conn.ping_sent_at.lock().await = Some(Instant::now());
                    }
                }

                // FIXED: Use the dedicated pong response method
                self.send_pong_response(connection_id).await?;
            }
            WsMessage::Pong => {
                debug!("Pong received from {}", connection_id);
                // Calculate latency - restructured to avoid borrowing issues
                let sent_at = {
                    let connections = self.connections.read().await;
                    if let Some(conn) = connections.get(&connection_id) {
                        *conn.ping_sent_at.lock().await
                    } else {
                        None
                    }
                };

                if let Some(sent_at) = sent_at {
                    let latency = sent_at.elapsed().as_millis() as u64;
                    
                    // Update connection info with latency
                    let mut connections = self.connections.write().await;
                    if let Some(conn) = connections.get_mut(&connection_id) {
                        conn.info.ping_latency_ms = Some(latency);
                    }

                    self.log_debug(
                        "verbose",
                        "Ping",
                        &format!("Pong from {}: {}ms", connection_id, latency),
                        None,
                    ).await;
                }
            }
            // FIXED: Added handling for request messages
            WsMessage::RequestConnectionInfo => {
                info!("Connection info requested by {}", connection_id);
                self.send_connection_info(connection_id).await?;
            }
            WsMessage::RequestActiveConnections => {
                info!("Active connections requested by {}", connection_id);
                self.send_active_connections(connection_id).await?;
            }
            WsMessage::Subscribe { payload } => {
                info!("Subscribe request from {}: {:?}", connection_id, payload.topics);
                self.handle_subscribe(connection_id, payload.topics).await?;
            }
            WsMessage::Unsubscribe { payload } => {
                info!("Unsubscribe request from {}: {:?}", connection_id, payload.topics);
                self.handle_unsubscribe(connection_id, payload.topics).await?;
            }
            WsMessage::Custom { event, payload } => {
                info!("Custom event '{}' from {}", event, connection_id);
                self.log_debug(
                    "info",
                    "Custom",
                    &format!("Custom event '{}' from {}", event, connection_id),
                    Some(payload.clone()),
                ).await;

                let msg = WsMessage::Custom { event, payload };
                self.broadcast_to_all(msg).await?;
            }
            _ => {
                debug!("Unhandled message type from {}", connection_id);
            }
        }

        Ok(())
    }

    /// Send connection info to a specific client
    async fn send_connection_info(&self, connection_id: ConnectionId) -> Result<(), ApiError> {
        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(&connection_id) {
            let connection_details = ConnectionDetails {
                connection_id,
                ip: conn.info.remote_addr
                    .map(|addr| addr.ip().to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                connected_at: conn.info.connected_at,
                user_agent: conn.info.user_agent.clone(),
            };

            let response = WsMessage::ConnectionInfo {
                payload: connection_details,
            };

            self.send_to_connection(connection_id, response).await?;
            info!("Sent connection info to {}", connection_id);
            Ok(())
        } else {
            warn!("Connection not found for info request: {}", connection_id);
            Err(ApiError::WebSocketError("Connection not found".to_string()))
        }
    }

    /// Send active connections to a specific client
    async fn send_active_connections(&self, connection_id: ConnectionId) -> Result<(), ApiError> {
        let connections = self.connections.read().await;
        let summaries: Vec<_> = connections
            .values()
            .map(|c| c.info.to_summary())
            .collect();

        let stats = ConnectionStats {
            count: connections.len(),
            connections: summaries,
        };

        let response = WsMessage::ActiveConnections { payload: stats };
        self.send_to_connection(connection_id, response).await?;
        info!("Sent active connections to {}", connection_id);
        Ok(())
    }

    /// Handle subscription
    async fn handle_subscribe(
        &self,
        connection_id: ConnectionId,
        topics: Vec<String>,
    ) -> Result<(), ApiError> {
        let mut connections = self.connections.write().await;
        if let Some(conn) = connections.get_mut(&connection_id) {
            for topic in &topics {
                if !conn.info.subscriptions.contains(topic) {
                    conn.info.subscriptions.push(topic.clone());
                }
            }

            self.log_debug(
                "info",
                "Subscribe",
                &format!("{} subscribed to {:?}", connection_id, topics),
                None,
            ).await;

            info!("{} subscribed to {:?}", connection_id, topics);
        }
        Ok(())
    }

    /// Handle unsubscribe
    async fn handle_unsubscribe(
        &self,
        connection_id: ConnectionId,
        topics: Vec<String>,
    ) -> Result<(), ApiError> {
        let mut connections = self.connections.write().await;
        if let Some(conn) = connections.get_mut(&connection_id) {
            conn.info.subscriptions.retain(|t| !topics.contains(t));

            self.log_debug(
                "info",
                "Unsubscribe",
                &format!("{} unsubscribed from {:?}", connection_id, topics),
                None,
            ).await;

            info!("{} unsubscribed from {:?}", connection_id, topics);
        }
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// BROADCASTING WITH DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════════

impl WebSocketService {
    /// Send to specific connection
    #[instrument(name = "send_to_connection", level = "info", skip(self, msg))]
    pub async fn send_to_connection(
        &self,
        connection_id: ConnectionId,
        msg: WsMessage,
    ) -> Result<(), ApiError> {
        let connections = self.connections.read().await;
        if let Some(conn) = connections.get(&connection_id) {
            let msg_text = serde_json::to_string(&msg)
                .map_err(|e| ApiError::SerializationError(e.to_string()))?;

            conn.sender.lock().await
                .send(Message::Text(msg_text))
                .await
                .map_err(|e| ApiError::WebSocketError(e.to_string()))?;

            debug!("Message sent to connection {}", connection_id);
            Ok(())
        } else {
            warn!("Connection not found: {}", connection_id);
            Err(ApiError::WebSocketError("Connection not found".to_string()))
        }
    }

    /// Broadcast to topic
    #[instrument(name = "broadcast_to_topic", level = "info", skip(self, msg))]
    pub async fn broadcast_to_topic(
        &self,
        topic: &SubscriptionTopic,
        msg: WsMessage,
    ) -> Result<(), ApiError> {
        let connections = self.connections.read().await;
        let topic_str = topic.to_string();

        debug!("Broadcasting to topic: {}", topic_str);
        
        for (conn_id, conn) in connections.iter() {
            let should_send = matches!(topic, SubscriptionTopic::All) ||
                conn.info.subscriptions.contains(&topic_str);

            if should_send {
                if let Err(e) = self.send_to_connection(*conn_id, msg.clone()).await {
                    warn!("Failed to send to connection {}: {}", conn_id, e);
                }
            }
        }

        Ok(())
    }

    /// Broadcast to all
    pub async fn broadcast_to_all(&self, msg: WsMessage) -> Result<(), ApiError> {
        self.broadcast_to_topic(&SubscriptionTopic::All, msg).await
    }
}
// ═══════════════════════════════════════════════════════════════════════════════════
// HEALTH MONITORING WITH DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════════

impl WebSocketService {
    /// Start background tasks
    pub async fn start_background_tasks(self: Arc<Self>) {
        info!("Starting background tasks");

        let service = self.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                service.config.read().await.ping_interval
            );

            loop {
                interval.tick().await;
                service.health_check().await;
            }
        });
    }

    /// Health check
    async fn health_check(&self) {
        let mut to_remove = Vec::new();
        let connections = self.connections.read().await;
        let timeout = self.config.read().await.connection_timeout;

        debug!("Running health check on {} connections", connections.len());
        
        for (id, conn) in connections.iter() {
            if conn.info.is_stale(timeout) {
                warn!("Stale connection detected: {}", id);
                to_remove.push(*id);
            } else {
                if let Err(e) = self.send_to_connection(*id, WsMessage::Ping).await {
                    debug!("Failed to send ping to {}: {}", id, e);
                }
            }
        }

        drop(connections);

        for id in to_remove {
            self.cleanup_connection(id).await;
        }
    }

    /// Export debug data
    pub async fn export_debug_data(&self) -> serde_json::Value {
        serde_json::json!({
            "metrics": self.get_metrics().await,
            "debug_logs": self.get_debug_logs().await,
            "config": {
                "debug_enabled": self.debug_enabled.load(Ordering::Relaxed),
                "max_connections": self.config.read().await.max_connections,
            },
            "timestamp": Utc::now(),
        })
    }
}
