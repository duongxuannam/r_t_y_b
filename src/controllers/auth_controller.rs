use axum::{Json, Router, extract::State, http::StatusCode, routing::post};

use crate::{
    error::AppError,
    models::auth::{
        AuthResponse, ForgotPasswordRequest, LoginRequest, MessageResponse, RefreshRequest,
        RegisterRequest, ResetPasswordRequest,
    },
    services::auth_service,
    state::AppState,
};

#[utoipa::path(
    post,
    path = "/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 201, body = AuthResponse),
        (status = 400, body = crate::error::ErrorResponse)
    )
)]
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), AppError> {
    let response = auth_service::register(&state, payload).await?;
    Ok((StatusCode::CREATED, Json(response)))
}

#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, body = AuthResponse),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let response = auth_service::login(&state, payload).await?;
    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, body = AuthResponse),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let response = auth_service::refresh(&state, payload).await?;
    Ok(Json(response))
}

#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 204),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<StatusCode, AppError> {
    auth_service::logout(&state, payload).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/auth/forgot",
    tag = "auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, body = MessageResponse),
        (status = 400, body = crate::error::ErrorResponse)
    )
)]
pub async fn forgot(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    auth_service::forgot_password(&state, payload).await?;
    Ok(Json(MessageResponse {
        message: "Nếu email tồn tại, reset link sẽ được gửi.".to_string(),
    }))
}

#[utoipa::path(
    post,
    path = "/auth/reset",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, body = MessageResponse),
        (status = 400, body = crate::error::ErrorResponse)
    )
)]
pub async fn reset(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    auth_service::reset_password(&state, payload).await?;
    Ok(Json(MessageResponse {
        message: "Mật khẩu đã được cập nhật.".to_string(),
    }))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/forgot", post(forgot))
        .route("/auth/reset", post(reset))
}
