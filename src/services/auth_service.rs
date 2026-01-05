use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use sqlx::FromRow;
use uuid::Uuid;
use argon2::{PasswordHasher, PasswordVerifier};

use crate::{
    error::AppError,
    models::auth::{AuthResponse, Claims, LoginRequest, RefreshRequest, RegisterRequest, UserResponse},
    state::AppState,
};

pub async fn register(state: &AppState, payload: RegisterRequest) -> Result<AuthResponse, AppError> {
    if !payload.email.contains('@') {
        return Err(AppError::BadRequest("invalid email".to_string()));
    }
    if payload.password.len() < 8 {
        return Err(AppError::BadRequest("password must be at least 8 characters".to_string()));
    }

    let password_hash = hash_password(&payload.password)?;
    let user_id = Uuid::new_v4();

    let user = sqlx::query_as::<_, UserResponse>(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email",
    )
    .bind(user_id)
    .bind(payload.email.to_lowercase())
    .bind(password_hash)
    .fetch_one(&state.db)
    .await
    .map_err(|err| {
        if let sqlx::Error::Database(db_err) = &err {
            if db_err.constraint() == Some("users_email_key") {
                return AppError::BadRequest("email already registered".to_string());
            }
        }
        AppError::from(err)
    })?;

    let tokens = create_tokens(state, user.id).await?;
    Ok(AuthResponse {
        user,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    })
}

pub async fn login(state: &AppState, payload: LoginRequest) -> Result<AuthResponse, AppError> {
    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
    )
    .bind(payload.email.to_lowercase())
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    verify_password(&payload.password, &user.password_hash)?;

    let tokens = create_tokens(state, user.id).await?;
    Ok(AuthResponse {
        user: UserResponse { id: user.id, email: user.email },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    })
}

pub async fn refresh(state: &AppState, payload: RefreshRequest) -> Result<AuthResponse, AppError> {
    let token_hash = hash_token(&payload.refresh_token);

    let row = sqlx::query_as::<_, RefreshRow>(
        "SELECT rt.user_id, rt.expires_at, u.email FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = $1",
    )
    .bind(&token_hash)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    if row.expires_at < Utc::now() {
        return Err(AppError::Unauthorized);
    }

    sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(&state.db)
        .await?;

    let tokens = create_tokens(state, row.user_id).await?;
    Ok(AuthResponse {
        user: UserResponse { id: row.user_id, email: row.email },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
    })
}

pub async fn logout(state: &AppState, payload: RefreshRequest) -> Result<(), AppError> {
    let token_hash = hash_token(&payload.refresh_token);

    let result = sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
        .bind(token_hash)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::Unauthorized);
    }

    Ok(())
}

#[derive(Debug, FromRow)]
struct UserRow {
    id: Uuid,
    email: String,
    password_hash: String,
}

#[derive(Debug, FromRow)]
struct RefreshRow {
    user_id: Uuid,
    email: String,
    expires_at: DateTime<Utc>,
}

struct TokenPair {
    access_token: String,
    refresh_token: String,
}

fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
    let argon = argon2::Argon2::default();
    let hash = argon
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| AppError::Internal)?
        .to_string();
    Ok(hash)
}

fn verify_password(password: &str, hash: &str) -> Result<(), AppError> {
    let parsed_hash = argon2::password_hash::PasswordHash::new(hash)
        .map_err(|_| AppError::Unauthorized)?;
    let argon = argon2::Argon2::default();
    argon
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized)
}

fn hash_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());
    hex::encode(digest)
}

fn create_access_token(secret: &str, user_id: Uuid, ttl_minutes: i64) -> Result<String, AppError> {
    let exp = (Utc::now() + Duration::minutes(ttl_minutes)).timestamp() as usize;
    let claims = Claims { sub: user_id.to_string(), exp };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|_| AppError::Internal)
}

pub fn decode_token(secret: &str, token: &str) -> Result<Claims, AppError> {
    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())
        .map(|data| data.claims)
        .map_err(|_| AppError::Unauthorized)
}

async fn create_tokens(state: &AppState, user_id: Uuid) -> Result<TokenPair, AppError> {
    let access_token = create_access_token(&state.jwt.secret, user_id, state.jwt.access_ttl_minutes)?;

    let refresh_token = Uuid::new_v4().to_string();
    let token_hash = hash_token(&refresh_token);
    let expires_at = Utc::now() + Duration::days(state.jwt.refresh_ttl_days);

    sqlx::query(
        "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(&state.db)
    .await?;

    Ok(TokenPair { access_token, refresh_token })
}
