use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use axum_extra::extract::CookieJar;
use axum_extra::extract::cookie::{Cookie, SameSite};
use time::Duration;

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
    jar: CookieJar,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, CookieJar, Json<AuthResponse>), AppError> {
    let (response, refresh_token) = auth_service::register(&state, payload).await?;
    let jar = jar.add(build_refresh_cookie(&state, refresh_token));
    Ok((StatusCode::CREATED, jar, Json(response)))
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
    jar: CookieJar,
    Json(payload): Json<LoginRequest>,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    let (response, refresh_token) = auth_service::login(&state, payload).await?;
    let jar = jar.add(build_refresh_cookie(&state, refresh_token));
    Ok((jar, Json(response)))
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
    jar: CookieJar,
    payload: Option<Json<RefreshRequest>>,
) -> Result<(CookieJar, Json<AuthResponse>), AppError> {
    let refresh_token = extract_refresh_token(&state, &jar, payload)?;
    let (response, new_refresh_token) = auth_service::refresh(&state, &refresh_token).await?;
    let jar = jar.add(build_refresh_cookie(&state, new_refresh_token));
    Ok((jar, Json(response)))
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
    jar: CookieJar,
    payload: Option<Json<RefreshRequest>>,
) -> Result<(CookieJar, StatusCode), AppError> {
    let refresh_token = extract_refresh_token(&state, &jar, payload)?;
    auth_service::logout(&state, &refresh_token).await?;
    let jar = jar.remove(clear_refresh_cookie(&state));
    Ok((jar, StatusCode::NO_CONTENT))
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

fn build_refresh_cookie(state: &AppState, refresh_token: String) -> Cookie<'static> {
    let max_age = Duration::days(state.jwt.refresh_ttl_days);
    let mut builder = Cookie::build((state.refresh_cookie_name.clone(), refresh_token))
        .path("/api/auth")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(max_age);
    if state.refresh_cookie_secure {
        builder = builder.secure(true);
    }
    builder.build()
}

fn clear_refresh_cookie(state: &AppState) -> Cookie<'static> {
    let mut builder = Cookie::build((state.refresh_cookie_name.clone(), ""))
        .path("/api/auth")
        .http_only(true)
        .same_site(SameSite::Lax)
        .max_age(Duration::ZERO);
    if state.refresh_cookie_secure {
        builder = builder.secure(true);
    }
    builder.build()
}

fn extract_refresh_token(
    state: &AppState,
    jar: &CookieJar,
    payload: Option<Json<RefreshRequest>>,
) -> Result<String, AppError> {
    if let Some(payload) = payload {
        if let Some(token) = payload.refresh_token.as_deref() {
            if !token.trim().is_empty() {
                return Ok(token.to_string());
            }
        }
    }

    jar.get(&state.refresh_cookie_name)
        .map(|cookie| cookie.value().to_string())
        .ok_or(AppError::Unauthorized)
}
