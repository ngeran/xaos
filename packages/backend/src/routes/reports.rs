//! Reports Management Routes
//! 
//! Handles report configuration, retrieval, and filtering

use axum::{
    extract::{Path, State},
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::{AppState, models};

/// Individual report configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    /// Display title for the report
    pub title: String,
    /// Category grouping (e.g., "Routing", "Interfaces", "MPLS", "System")
    pub category: String,
    /// RPC method to call
    pub rpc: String,
    /// XPath for data extraction
    pub xpath: String,
    /// Field mappings for display
    pub fields: HashMap<String, String>,
    /// Optional RPC arguments
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rpc_args: Option<HashMap<String, serde_json::Value>>,
}

/// Response structure for listing all reports
#[derive(Serialize)]
pub struct ReportsListResponse {
    /// Total number of reports
    pub total: usize,
    /// Available categories
    pub categories: Vec<String>,
    /// All reports indexed by their ID
    pub reports: HashMap<String, Report>,
}

/// Response structure for filtered reports
#[derive(Serialize)]
pub struct FilteredReportsResponse {
    /// Category being filtered
    pub category: String,
    /// Number of reports in this category
    pub count: usize,
    /// Reports in the specified category
    pub reports: HashMap<String, Report>,
}

/// Get all available reports
/// Returns a comprehensive list of all reports with metadata
pub async fn get_all_reports(
    State(state): State<AppState>,
) -> models::ApiResult<Json<ReportsListResponse>> {
    // Load reports from YAML file
    let reports_data = state.yaml_service.get_yaml_data("reports", None).await?;
    
    // Parse the YAML data into our Report structures
    let reports: HashMap<String, Report> = serde_json::from_value(reports_data)
        .map_err(|e| models::ApiError::ValidationError(format!("Failed to parse reports: {}", e)))?;
    
    // Extract unique categories
    let mut categories: Vec<String> = reports
        .values()
        .map(|report| report.category.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    categories.sort();
    
    let response = ReportsListResponse {
        total: reports.len(),
        categories,
        reports,
    };
    
    Ok(Json(response))
}

/// Get a specific report by ID
/// Returns the report configuration for the specified report_id
pub async fn get_report_by_id(
    Path(report_id): Path<String>,
    State(state): State<AppState>,
) -> models::ApiResult<Json<Report>> {
    // Load reports from YAML file
    let reports_data = state.yaml_service.get_yaml_data("reports", None).await?;
    let reports: HashMap<String, Report> = serde_json::from_value(reports_data)
        .map_err(|e| models::ApiError::ValidationError(format!("Failed to parse reports: {}", e)))?;
    
    // Find the specific report
    match reports.get(&report_id) {
        Some(report) => Ok(Json(report.clone())),
        None => Err(models::ApiError::NotFound(format!("Report '{}' not found", report_id))),
    }
}

/// Filter reports by category
/// Returns all reports that belong to the specified category
pub async fn filter_reports_by_category(
    Path(category): Path<String>,
    State(state): State<AppState>,
) -> models::ApiResult<Json<FilteredReportsResponse>> {
    // Load reports from YAML file
    let reports_data = state.yaml_service.get_yaml_data("reports", None).await?;
    let all_reports: HashMap<String, Report> = serde_json::from_value(reports_data)
        .map_err(|e| models::ApiError::ValidationError(format!("Failed to parse reports: {}", e)))?;
    
    // Filter reports by category
    let filtered_reports: HashMap<String, Report> = all_reports
        .into_iter()
        .filter(|(_, report)| report.category.eq_ignore_ascii_case(&category))
        .collect();
    
    if filtered_reports.is_empty() {
        return Err(models::ApiError::NotFound(format!("No reports found for category '{}'", category)));
    }
    
    let response = FilteredReportsResponse {
        category: category.clone(),
        count: filtered_reports.len(),
        reports: filtered_reports,
    };
    
    Ok(Json(response))
}

/// Creates reports-related routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/reports", get(get_all_reports))
        .route("/api/reports/:report_id", get(get_report_by_id))
        .route("/api/reports/filter/:category", get(filter_reports_by_category))
}
