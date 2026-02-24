use axum::{Json, Router, extract::State, routing::post};

use crate::{
    error::AppError,
    models::ai::{AiGenerateRequest, AiGenerateResponse},
    services::ai_service,
    state::AppState,
};

#[utoipa::path(
    post,
    path = "/ai/generate",
    tag = "ai",
    request_body = AiGenerateRequest,
    responses(
        (status = 200, body = AiGenerateResponse),
        (status = 400, body = crate::error::ErrorResponse),
        (status = 500, body = crate::error::ErrorResponse)
    )
)]
pub async fn generate(
    State(state): State<AppState>,
    Json(payload): Json<AiGenerateRequest>,
) -> Result<Json<AiGenerateResponse>, AppError> {
    let response = ai_service::generate(&state, payload).await?;
    Ok(Json(response))
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/ai/generate", post(generate))
}
