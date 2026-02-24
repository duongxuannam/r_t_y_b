use axum::{Json, Router, routing::get};
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize, utoipa::ToSchema)]
pub struct CoverageResponse {
    pub unit_test_coverage: String,
    pub notes: String,
}

#[utoipa::path(
    get,
    path = "/system/unit-test-coverage",
    tag = "system",
    responses((status = 200, body = CoverageResponse))
)]
pub async fn unit_test_coverage() -> Json<CoverageResponse> {
    Json(CoverageResponse {
        unit_test_coverage: "N/A in runtime".to_string(),
        notes: "Coverage should be generated in CI and exposed by frontend dashboard.".to_string(),
    })
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/system/unit-test-coverage", get(unit_test_coverage))
}
