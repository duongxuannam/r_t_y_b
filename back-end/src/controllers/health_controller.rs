use axum::Json;
use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct HealthResponse {
    pub message: String,
}

#[utoipa::path(
    get,
    path = "/health",
    tag = "health",
    responses((status = 200, body = HealthResponse))
)]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        message: "success".to_string(),
    })
}
