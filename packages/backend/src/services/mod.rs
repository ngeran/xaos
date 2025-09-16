// File Path: src/services/mod.rs
// Version: 1.2.1
// Description: Services module that organizes all application services.
// Updated to include Python runner service while maintaining backward compatibility.
//
// Key Features:
// - Backward compatible with existing services
// - Modular service management
// - Clean service interface exports
//
// Usage Guide:
// Existing code continues to work unchanged.
// New Python runner service is available for script execution.
//
// Change Log:
// - 1.2.1: Removed initialize_services function to avoid conflicts
// - 1.2.0: Added Python runner service exports
// - 1.0.0: Initial version with YAML and WebSocket services

// =============================================================================
// SECTION 1: EXISTING SERVICE EXPORTS (MAINTAIN BACKWARD COMPATIBILITY)
// =============================================================================
// These exports ensure existing code continues to work without modification

/// YAML configuration management service for schema validation and data handling
pub mod yaml_service;
pub use yaml_service::YamlService;

/// WebSocket communication service for real-time client connections
pub mod websocket_service;
pub use websocket_service::WebSocketService;

// =============================================================================
// SECTION 2: NEW PYTHON RUNNER SERVICE
// =============================================================================
// New service for executing Python scripts in Docker containers

/// Python script execution service for running scripts in Docker containers
pub mod python_runner;

/// Export Python runner service and its types for easy access
pub use python_runner::{PythonRunnerService, ExecutionStatus};
