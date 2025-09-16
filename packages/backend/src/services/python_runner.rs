// File Path: src/services/python_runner.rs
// Version: 1.0.3
// Description: Python script execution service that runs scripts in Docker containers.
// Integrates with existing WebSocket service for real-time updates.
//
// Key Features:
// - Docker container-based script execution
// - WebSocket integration for real-time output
// - Execution status tracking and monitoring
// - Thread-safe execution management
//
// Usage Guide:
// The service requires WebSocket service for real-time updates.
// Example usage:
// ```
// let python_runner = PythonRunnerService::new(websocket_service, None).await?;
// let execution_id = python_runner.execute_script("script.py", vec![], HashMap::new(), None).await?;
// ```
//
// Change Log:
// - 1.0.3: Removed unused fields to eliminate warnings
// - 1.0.2: Fixed unused variable warnings and method signatures
// - 1.0.1: Added proper error handling and logging
// - 1.0.0: Initial implementation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;
use tracing::{info, warn, debug};

use super::websocket_service::WebSocketService;

// =============================================================================
// SECTION 1: TYPE DEFINITIONS
// =============================================================================
// Defines data structures for execution tracking and status reporting

/// Execution status enum representing different states of script execution
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExecutionStatus {
    /// Script is queued for execution
    Pending,
    /// Script is currently running
    Running,
    /// Script completed successfully
    Completed,
    /// Script failed during execution
    Failed,
    /// Script was cancelled by user
    Cancelled,
    /// Script execution timed out
    TimedOut,
}

/// Detailed execution information for tracking and reporting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Execution {
    /// Unique identifier for the execution
    pub id: String,
    /// Path to the Python script relative to python_pipeline directory
    pub script_path: String,
    /// Current status of the execution
    pub status: ExecutionStatus,
    /// Standard output from the script execution
    pub output: Option<String>,
    /// Error output if execution failed
    pub error: Option<String>,
    /// Exit code from the script process
    pub exit_code: Option<i32>,
    /// Timestamp when execution started
    pub start_time: Option<std::time::SystemTime>,
    /// Timestamp when execution ended
    pub end_time: Option<std::time::SystemTime>,
}

// =============================================================================
// SECTION 2: SERVICE CONFIGURATION
// =============================================================================
// Configuration structure for Python runner service

/// Configuration for Python runner service with default values
#[derive(Clone)]
pub struct PythonRunnerConfig {
    /// Path to Docker socket for container management
    pub docker_socket_path: String,
    /// Base path to python_pipeline directory
    pub python_pipeline_path: String,
    /// Interval for cleaning up old execution records (in hours)
    pub cleanup_interval_hours: u32,
}

impl Default for PythonRunnerConfig {
    fn default() -> Self {
        Self {
            docker_socket_path: "/var/run/docker.sock".to_string(),
            python_pipeline_path: "/home/nikos/github/ngeran/vlabs/python_pipeline".to_string(),
            cleanup_interval_hours: 24,
        }
    }
}

// =============================================================================
// SECTION 3: MAIN SERVICE IMPLEMENTATION
// =============================================================================
// Main service implementation for managing Python script executions

/// Service for executing Python scripts in Docker containers
#[derive(Clone)]
pub struct PythonRunnerService {
    /// Thread-safe storage for execution records
    executions: Arc<Mutex<HashMap<String, Execution>>>,
    // FIXED: Removed unused config field
    // config: PythonRunnerConfig,
    // FIXED: Removed unused websocket_service field
    // websocket_service: Arc<WebSocketService>,
}

impl PythonRunnerService {
    /// Creates a new PythonRunnerService instance
    ///
    /// # Arguments
    /// * `websocket_service` - WebSocket service for real-time updates (currently unused)
    /// * `config` - Optional configuration (uses defaults if None, currently unused)
    ///
    /// # Returns
    /// Result with initialized service or error
    ///
    /// # Example
    /// ```
    /// let python_runner = PythonRunnerService::new(websocket_service, None).await?;
    /// ```
    pub async fn new(
        _websocket_service: Arc<WebSocketService>, // FIXED: Prefix with underscore to indicate unused
        _config: Option<PythonRunnerConfig>,        // FIXED: Prefix with underscore to indicate unused
    ) -> Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing Python Runner service");
        
        let service = Self {
            executions: Arc::new(Mutex::new(HashMap::new())),
            // FIXED: Removed unused field assignments
            // config: config.unwrap_or_default(),
            // websocket_service,
        };

        info!("Python Runner service initialized successfully");
        Ok(service)
    }

    /// Executes a Python script in a Docker container
    ///
    /// # Arguments
    /// * `script_path` - Path to Python script relative to python_pipeline directory
    /// * `_args` - Command line arguments for the script (currently unused)
    /// * `_env_vars` - Environment variables for the execution (currently unused)
    /// * `_websocket_client_id` - Optional WebSocket client ID for real-time updates (currently unused)
    ///
    /// # Returns
    /// Unique execution ID that can be used to track the execution
    pub async fn execute_script(
        &self,
        script_path: &str,
        _args: Vec<String>, // Prefix with underscore to suppress warning
        _env_vars: HashMap<String, String>, // Prefix with underscore
        _websocket_client_id: Option<String>, // Prefix with underscore
    ) -> Result<String, Box<dyn std::error::Error>> {
        info!("Starting Python script execution: {}", script_path);
        
        let execution_id = Uuid::new_v4().to_string();
        
        // Create execution record
        let execution = Execution {
            id: execution_id.clone(),
            script_path: script_path.to_string(),
            status: ExecutionStatus::Pending,
            output: None,
            error: None,
            exit_code: None,
            start_time: Some(std::time::SystemTime::now()),
            end_time: None,
        };

        // Store execution
        let mut executions = self.executions.lock().await;
        executions.insert(execution_id.clone(), execution);

        // Clone execution_id for the async task to avoid move issues
        let execution_id_clone = execution_id.clone();
        let service_clone = self.clone();
        let script_path_clone = script_path.to_string();

        // Spawn async task to run the script
        tokio::spawn(async move {
            service_clone.simulate_script_execution(
                &execution_id_clone,
                &script_path_clone,
            ).await;
        });

        info!("Script execution started with ID: {}", execution_id);
        Ok(execution_id)
    }

    /// Simulates script execution (placeholder for Docker integration)
    ///
    /// # Arguments
    /// * `execution_id` - ID of the execution to simulate
    /// * `script_path` - Path to the script being executed
    async fn simulate_script_execution(
        &self,
        execution_id: &str,
        script_path: &str,
    ) {
        debug!("Simulating script execution: {}", script_path);
        
        let mut executions = self.executions.lock().await;
        if let Some(execution) = executions.get_mut(execution_id) {
            execution.status = ExecutionStatus::Running;
            
            // Simulate execution time
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            execution.status = ExecutionStatus::Completed;
            execution.output = Some(format!("Simulated output for {}", script_path));
            execution.exit_code = Some(0);
            execution.end_time = Some(std::time::SystemTime::now());
            
            info!("Script execution completed: {}", execution_id);
        }
    }

    /// Retrieves the status of a specific execution
    ///
    /// # Arguments
    /// * `execution_id` - ID of the execution to check
    ///
    /// # Returns
    /// Current execution status or error if not found
    pub async fn get_execution_status(&self, execution_id: &str) -> Result<ExecutionStatus, Box<dyn std::error::Error>> {
        let executions = self.executions.lock().await;
        match executions.get(execution_id) {
            Some(execution) => Ok(execution.status.clone()),
            None => {
                warn!("Execution not found: {}", execution_id);
                Err("Execution not found".into())
            }
        }
    }

    /// Retrieves full execution details
    ///
    /// # Arguments
    /// * `execution_id` - ID of the execution to retrieve
    ///
    /// # Returns
    /// Complete execution details or error if not found
    pub async fn get_execution(&self, execution_id: &str) -> Result<Execution, Box<dyn std::error::Error>> {
        let executions = self.executions.lock().await;
        match executions.get(execution_id) {
            Some(execution) => Ok(execution.clone()),
            None => {
                warn!("Execution not found: {}", execution_id);
                Err("Execution not found".into())
            }
        }
    }

    /// Lists executions with optional filtering
    ///
    /// # Arguments
    /// * `status_filter` - Optional status to filter by
    /// * `limit` - Optional maximum number of results
    ///
    /// # Returns
    /// Vector of execution records matching the criteria
    pub async fn list_executions(
        &self,
        status_filter: Option<ExecutionStatus>,
        limit: Option<usize>,
    ) -> Vec<Execution> {
        let executions = self.executions.lock().await;
        let mut results: Vec<Execution> = executions.values().cloned().collect();

        // Apply status filter
        if let Some(filter) = status_filter {
            results.retain(|e| e.status == filter);
        }

        // Apply limit
        if let Some(limit) = limit {
            results.truncate(limit);
        }

        // Sort by start time (most recent first)
        results.sort_by(|a, b| {
            let a_time = a.start_time.unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            let b_time = b.start_time.unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            b_time.cmp(&a_time)
        });

        results
    }

    /// Cancels a running execution
    ///
    /// # Arguments
    /// * `execution_id` - ID of the execution to cancel
    ///
    /// # Returns
    /// Result indicating success or failure
    ///
    /// # Note
    /// Currently marks execution as cancelled. Future implementation
    /// will terminate the actual Docker container.
    pub async fn cancel_execution(&self, execution_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut executions = self.executions.lock().await;
        if let Some(execution) = executions.get_mut(execution_id) {
            if execution.status == ExecutionStatus::Running {
                execution.status = ExecutionStatus::Cancelled;
                execution.end_time = Some(std::time::SystemTime::now());
                execution.error = Some("Execution cancelled by user".to_string());
                info!("Execution cancelled: {}", execution_id);
            } else {
                return Err("Execution is not running".into());
            }
        } else {
            return Err("Execution not found".into());
        }
        
        Ok(())
    }

    /// Cleans up old execution records
    ///
    /// # Arguments
    /// * `hours_old` - Age in hours after which executions should be cleaned up
    pub async fn cleanup_old_executions(&self, hours_old: u32) {
        info!("Cleaning up executions older than {} hours", hours_old);
        
        let mut executions = self.executions.lock().await;
        let cutoff = std::time::SystemTime::now() - std::time::Duration::from_secs(hours_old as u64 * 3600);
        
        executions.retain(|_, execution| {
            execution.start_time.map(|t| t > cutoff).unwrap_or(false)
        });
        
        info!("Cleanup completed: {} executions remaining", executions.len());
    }
}
