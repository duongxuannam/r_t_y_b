use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::Type;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, utoipa::ToSchema)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "snake_case")]
pub enum Role {
    User,
    Admin,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::Admin => "admin",
        }
    }
}

impl TryFrom<&str> for Role {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "user" => Ok(Self::User),
            "admin" => Ok(Self::Admin),
            _ => Err(()),
        }
    }
}

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
    pub role: Role,
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
    pub role: String,
    pub exp: usize,
}
