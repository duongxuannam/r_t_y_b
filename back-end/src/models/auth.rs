use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RefreshRequest {
    #[serde(default)]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub password: String,
}

#[derive(Debug, Serialize, FromRow, utoipa::ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub access_token: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}
