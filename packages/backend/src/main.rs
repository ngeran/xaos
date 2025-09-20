// File Path: src/main.rs
// Version: 1.2.5
//
// Description:
// Main application entry point with Python runner integration.
// Maintains the existing architecture while adding Python execution capabilities.
//
// Key Features:
// - Modular service initialization
// - WebSocket support for real-time communication
// - Python script execution in Docker containers
// - Background task management
// - Comprehensive logging
//
// Usage Guide:
// Run the server with: cargo run
// The server will start on http://127.0.0.1:3001
// WebSocket endpoint: ws://127.0.0.1:3001/ws
// Python API: http://127.0.0.1:3001/api/python/*
//
// Change Log:
// - 1.2.5: Fixed WebSocket service ownership issue and Python runner integration
// - 1.2.4: Added Python runner service initialization
// - 1.2.3: Updated YAML service constructor call
// - 1.2.2: WebSocket service integration
// - 1.2.1: Initial Python integration
// - 1.2.0: Enhanced service architecture
// - 1.1.0: Initial WebSocket support
// - 1.0.0: Base application structure

use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;
use tracing::{info, Level};

mod models;
mod services;
mod api;
mod routes;

use services::{YamlService, WebSocketService, PythonRunnerService};

// =============================================================================
// SECTION 1: APPLICATION STATE
// =============================================================================
// Defines the global application state shared across all handlers

/// Global application state shared across all handlers
/// Contains all services needed for request processing
#[derive(Clone)]
pub struct AppState {
    /// YAML validation and schema service
    pub yaml_service: Arc<YamlService>,
    /// WebSocket connection management service
    pub websocket_service: Arc<WebSocketService>,
    /// Python script execution service
    pub python_runner_service: Arc<PythonRunnerService>,
}

// =============================================================================
// SECTION 2: MAIN APPLICATION
// =============================================================================
// Main application entry point and service initialization

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging with DEBUG level
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    info!("Starting Rust Backend Server with Python Runner...");

    // =========================================================================
    // SERVICE INITIALIZATION
    // =========================================================================
    // Initialize all application services with proper error handling

    info!("Initializing YAML service...");
    let yaml_service = Arc::new(YamlService::new("./shared/schemas", "./shared/data").await?);

    info!("Initializing WebSocket service...");
    let websocket_service = Arc::new(WebSocketService::new(None));

    // Start WebSocket background tasks - clone first to avoid ownership issues
    let websocket_service_clone = websocket_service.clone();
    websocket_service_clone.start_background_tasks().await;
    info!("WebSocket background tasks started");

    info!("Initializing Python Runner service...");
    let python_runner_service = Arc::new(
        PythonRunnerService::new(websocket_service.clone(), None).await?
    );
    info!("Python Runner service initialized");

    // =========================================================================
    // BACKGROUND TASK MANAGEMENT
    // =========================================================================
    // Start background tasks for maintenance and cleanup

    // Start background cleanup task for old executions
    spawn_cleanup_task(python_runner_service.clone());

    // =========================================================================
    // APPLICATION STATE SETUP
    // =========================================================================
    // Create and configure the global application state

    // Create application state with all initialized services
    let state = AppState {
        yaml_service,
        websocket_service,
        python_runner_service,
    };

    info!("Application state initialized successfully");

    // =========================================================================
    // ROUTE CONFIGURATION
    // =========================================================================
    // Set up all API routes and middleware

    info!("Configuring application routes...");
    let app = routes::create_routes()
        .with_state(state)
        .layer(CorsLayer::permissive());

    info!("Routes configured successfully");

    // =========================================================================
    // SERVER CONFIGURATION
    // =========================================================================
    // Configure and start the HTTP server

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    info!("Server listening on {}", addr);
    info!("WebSocket endpoint available at ws://{}/ws", addr);
    info!("Python API endpoints available at http://{}/api/python/*", addr);
    info!("API documentation available at http://{}/health", addr);
    info!("YAML validation endpoints available at http://{}/api/yaml/*", addr);

    // Start the server with proper error handling
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>()
    ).await?;

    Ok(())
}

// =============================================================================
// SECTION 3: BACKGROUND TASKS
// =============================================================================
// Background task management for cleanup and maintenance

/// Spawns a background task to clean up old execution records
///
/// # Arguments
/// * `python_runner_service` - Python runner service for cleanup operations
///
/// # Behavior
/// - Runs every hour
/// - Removes executions older than 24 hours
/// - Logs cleanup operations for monitoring
fn spawn_cleanup_task(python_runner_service: Arc<PythonRunnerService>) {
    tokio::spawn(async move {
        info!("Starting execution cleanup task");

        let mut interval = tokio::time::interval(
            // Use from_secs instead of from_hours to avoid unstable feature
            tokio::time::Duration::from_secs(3600) // 1 hour
        );

        loop {
            interval.tick().await;
            info!("Running execution cleanup cycle");
            python_runner_service.cleanup_old_executions(24).await;
            info!("Completed execution cleanup cycle");
        }
    });
}
