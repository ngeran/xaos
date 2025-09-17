// File Path: src/routes/mod.rs
// Version: 1.2.0
//
// Description:
// Routes module that organizes all API routes into logical groups.
// Updated to include sidebar routes.
//
// Key Features:
// - Modular route organization
// - Clean separation of concerns
// - Easy route management and extension
//
// Usage Guide:
// All routes are automatically merged when create_routes() is called.
// To add new routes:
// 1. Create a new module in the routes directory
// 2. Import it here
// 3. Add it to the merge chain in create_routes()
 
use axum::Router;
use crate::AppState;
 
// Route modules
mod health;
mod yaml;
mod navigation;
mod websocket;
mod reports;
mod python;  // New Python execution routes
mod inventory;
mod sidebar;  // Add sidebar routes
 
/// Creates and configures all application routes
///
/// This function assembles all route modules into a single router,
/// making it easy to manage and extend the API surface.
///
/// # Returns
/// A configured Router with all application routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        // Health monitoring routes
        .merge(health::routes())
 
        // YAML data management routes
        .merge(yaml::routes())

        // Inventory Routes
        .merge(inventory::routes())
        
        // Sidebar configuration routes
        .merge(sidebar::routes())

        // Navigation configuration routes
        .merge(navigation::routes())
 
        // Reports management routes
        .merge(reports::routes())
 
        // WebSocket communication routes
        .merge(websocket::routes())
 
        // Python script execution routes
        .merge(python::routes())
}
