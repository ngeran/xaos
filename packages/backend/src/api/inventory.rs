// File Path: src/api/inventory.rs
// Version: 1.3.1
//
// Description:
// API handlers for accessing the network inventory (routers, switches, firewalls).
//
// Key Features:
// - Loads inventory.yaml using YamlService
// - Lists all YAML files in the shared/data/inventories directory
// - Returns structured JSON response
// - Provides error handling for missing/invalid YAML
//
// Usage Guide:
// GET /api/inventory → returns full inventory
// GET /api/inventory/list → lists all inventory YAML files
//
// Change Log:
// - 1.3.1: Fixed absolute path for Docker container
// - 1.3.0: Fixed path consistency issues
// - 1.2.0: Fixed path handling for shared/data structure
// - 1.1.0: Added list_inventory_files endpoint
// - 1.0.0: Initial implementation

use axum::{extract::State, response::Json};
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;

use crate::{AppState, models::ApiResult};
use crate::models::ApiError;

// =============================================================================
// Inventory Data Retrieval
// =============================================================================
// Handlers for fetching and reading inventory data

/// Handler to return the full inventory
pub async fn get_inventory(State(state): State<AppState>) -> ApiResult<Json<Value>> {
    // Load inventory.yaml from shared/data/inventories - FIXED PATH
    let data = state.yaml_service
        .get_yaml_data("inventories/inventory", None)
        .await
        .map_err(|e| ApiError::YamlParseError(format!("Failed to load inventory: {}", e)))?;

    Ok(Json(data))
}

// =============================================================================
// Inventory File Listing
// =============================================================================
// Handlers for discovering and listing available inventory files

/// Handler to list all YAML files in the shared/data/inventories directory
pub async fn list_inventory_files() -> ApiResult<Json<Value>> {
    // Define the inventories directory path - FIXED: Use absolute Docker path
    let inventories_path = Path::new("/shared/data/inventories");

    // Check if directory exists
    if !inventories_path.exists() {
        return Ok(Json(json!({
            "files": [],
            "message": "Inventories directory not found",
            "path": "/shared/data/inventories",
            "absolute_path": inventories_path.canonicalize().ok().and_then(|p| p.to_str().map(|s| s.to_string()))
        })));
    }

    // Debug: print the actual path being checked
    println!("Checking inventory path: {:?}", inventories_path);
    println!("Absolute path: {:?}", inventories_path.canonicalize());

    // Read directory contents
    let mut entries = fs::read_dir(inventories_path).await?;

    let mut yaml_files = Vec::new();

    // Iterate through directory entries
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();

        // Check if it's a file with .yaml or .yml extension
        if path.is_file() {
            if let Some(extension) = path.extension() {
                if extension == "yaml" || extension == "yml" {
                    // Extract file information
                    let file_name = path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or_default()
                        .to_string();

                    let file_stem = path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or_default()
                        .to_string();

                    // Get file metadata
                    let metadata = entry.metadata().await?;

                    yaml_files.push(json!({
                        "name": file_name,
                        "stem": file_stem,
                        "size": metadata.len(),
                        "modified": metadata.modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_secs())
                            .unwrap_or(0)
                    }));
                }
            }
        }
    }

    // Sort files by name
    yaml_files.sort_by(|a, b| {
        a.get("name").and_then(|v| v.as_str()).unwrap_or("")
            .cmp(b.get("name").and_then(|v| v.as_str()).unwrap_or(""))
    });

    Ok(Json(json!({
        "files": yaml_files,
        "count": yaml_files.len(),
        "path": "/shared/data/inventories"
    })))
}

// =============================================================================
// Specific Inventory File Access
// =============================================================================
// Handlers for reading specific inventory files

/// Handler to get a specific inventory file by name
pub async fn get_inventory_file(
    State(state): State<AppState>,
    axum::extract::Path(filename): axum::extract::Path<String>
) -> ApiResult<Json<Value>> {
    // Remove .yaml/.yml extension if provided
    let file_stem = filename.trim_end_matches(".yaml").trim_end_matches(".yml");

    // Construct the path relative to the inventories directory
    let inventory_path = format!("inventories/{}", file_stem);

    // Load the specific inventory file
    let data = state.yaml_service
        .get_yaml_data(&inventory_path, None)
        .await
        .map_err(|e| ApiError::YamlParseError(format!("Failed to load inventory file '{}': {}", filename, e)))?;

    Ok(Json(json!({
        "filename": format!("{}.yaml", file_stem),
        "data": data
    })))
}
