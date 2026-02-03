use axum::Json;
use serde::Serialize;

use crate::locale::Language;

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
pub async fn health_check(language: Language) -> Json<HealthResponse> {
    Json(HealthResponse {
        message: language.message("success", "thành công"),
    })
}
