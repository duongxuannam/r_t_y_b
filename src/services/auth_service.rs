use argon2::{PasswordHasher, PasswordVerifier};
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::AppError,
    models::auth::{
        AuthResponse, Claims, ForgotPasswordRequest, LoginRequest, RegisterRequest,
        ResetPasswordRequest, UserResponse,
    },
    services::email_service,
    state::AppState,
};

pub async fn register(
    state: &AppState,
    payload: RegisterRequest,
) -> Result<(AuthResponse, String), AppError> {
    validate_register_payload(&payload)?;

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
    Ok((
        AuthResponse {
        user,
        access_token: tokens.access_token,
        },
        tokens.refresh_token,
    ))
}

pub async fn login(
    state: &AppState,
    payload: LoginRequest,
) -> Result<(AuthResponse, String), AppError> {
    let user =
        sqlx::query_as::<_, UserRow>("SELECT id, email, password_hash FROM users WHERE email = $1")
            .bind(payload.email.to_lowercase())
            .fetch_optional(&state.db)
            .await?
            .ok_or(AppError::Unauthorized)?;

    verify_password(&payload.password, &user.password_hash)?;

    let tokens = create_tokens(state, user.id).await?;
    Ok((
        AuthResponse {
            user: UserResponse {
                id: user.id,
                email: user.email,
            },
            access_token: tokens.access_token,
        },
        tokens.refresh_token,
    ))
}

pub async fn refresh(
    state: &AppState,
    refresh_token: &str,
) -> Result<(AuthResponse, String), AppError> {
    let token_hash = hash_token(refresh_token);

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
    Ok((
        AuthResponse {
            user: UserResponse {
                id: row.user_id,
                email: row.email,
            },
            access_token: tokens.access_token,
        },
        tokens.refresh_token,
    ))
}

pub async fn logout(state: &AppState, refresh_token: &str) -> Result<(), AppError> {
    let token_hash = hash_token(refresh_token);

    let result = sqlx::query("DELETE FROM refresh_tokens WHERE token_hash = $1")
        .bind(token_hash)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::Unauthorized);
    }

    Ok(())
}

pub async fn forgot_password(
    state: &AppState,
    payload: ForgotPasswordRequest,
) -> Result<(), AppError> {
    validate_email(&payload.email)?;

    let user = sqlx::query_as::<_, UserResponse>(
        "SELECT id, email FROM users WHERE email = $1",
    )
    .bind(payload.email.to_lowercase())
    .fetch_optional(&state.db)
    .await?;

    let Some(user) = user else {
        return Ok(());
    };

    sqlx::query("DELETE FROM password_resets WHERE user_id = $1")
        .bind(user.id)
        .execute(&state.db)
        .await?;

    let token = Uuid::new_v4().to_string();
    let token_hash = hash_token(&token);
    let expires_at = Utc::now() + Duration::minutes(state.email.reset_ttl_minutes);

    sqlx::query(
        "INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    )
    .bind(Uuid::new_v4())
    .bind(user.id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(&state.db)
    .await?;

    let reset_base = state.email.reset_url_base.trim_end_matches('/');
    let reset_link = format!("{reset_base}/reset?token={token}");

    email_service::send_reset_email(&state.email, &user.email, &reset_link).await?;
    Ok(())
}

pub async fn reset_password(
    state: &AppState,
    payload: ResetPasswordRequest,
) -> Result<(), AppError> {
    validate_password_basic(&payload.password)?;

    let token_hash = hash_token(&payload.token);
    let mut tx = state.db.begin().await?;

    let row = sqlx::query_as::<_, PasswordResetRow>(
        "SELECT user_id, expires_at FROM password_resets WHERE token_hash = $1 AND used_at IS NULL",
    )
    .bind(&token_hash)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::BadRequest("invalid or expired reset token".to_string()))?;

    if row.expires_at < Utc::now() {
        return Err(AppError::BadRequest(
            "invalid or expired reset token".to_string(),
        ));
    }

    let password_hash = hash_password(&payload.password)?;
    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(password_hash)
        .bind(row.user_id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("UPDATE password_resets SET used_at = NOW() WHERE token_hash = $1")
        .bind(token_hash)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM refresh_tokens WHERE user_id = $1")
        .bind(row.user_id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;
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

#[derive(Debug, FromRow)]
struct PasswordResetRow {
    user_id: Uuid,
    expires_at: DateTime<Utc>,
}

struct TokenPair {
    access_token: String,
    refresh_token: String,
}

fn validate_register_payload(payload: &RegisterRequest) -> Result<(), AppError> {
    validate_email(&payload.email)?;
    validate_password_basic(&payload.password)?;
    Ok(())
}

fn validate_email(email: &str) -> Result<(), AppError> {
    if !email.contains('@') {
        return Err(AppError::BadRequest("invalid email".to_string()));
    }
    Ok(())
}

fn validate_password_basic(password: &str) -> Result<(), AppError> {
    if password.len() < 8 {
        return Err(AppError::BadRequest(
            "password must be at least 8 characters".to_string(),
        ));
    }
    let has_letter = password.chars().any(|c| c.is_ascii_alphabetic());
    let has_number = password.chars().any(|c| c.is_ascii_digit());
    if !has_letter || !has_number {
        return Err(AppError::BadRequest(
            "password must include letters and numbers".to_string(),
        ));
    }
    Ok(())
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
    let parsed_hash =
        argon2::password_hash::PasswordHash::new(hash).map_err(|_| AppError::Unauthorized)?;
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
    let claims = Claims {
        sub: user_id.to_string(),
        exp,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| AppError::Internal)
}

pub fn decode_token(secret: &str, token: &str) -> Result<Claims, AppError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}

async fn create_tokens(state: &AppState, user_id: Uuid) -> Result<TokenPair, AppError> {
    let access_token =
        create_access_token(&state.jwt.secret, user_id, state.jwt.access_ttl_minutes)?;

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

    Ok(TokenPair {
        access_token,
        refresh_token,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::RegisterRequest;

    #[test]
    fn password_hash_and_verify_round_trip() {
        let password = "strong-password";
        let hash = hash_password(password).expect("hash");
        verify_password(password, &hash).expect("verify ok");

        let wrong = verify_password("bad-password", &hash);
        assert!(matches!(wrong, Err(AppError::Unauthorized)));
    }

    #[test]
    fn hash_token_is_sha256_hex() {
        let hashed = hash_token("refresh-token");
        assert_eq!(hashed.len(), 64);
        assert!(hashed.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn create_and_decode_access_token_round_trip() {
        let secret = "test-secret";
        let user_id = Uuid::new_v4();

        let token = create_access_token(secret, user_id, 5).expect("token");
        let claims = decode_token(secret, &token).expect("claims");

        assert_eq!(claims.sub, user_id.to_string());
    }

    #[test]
    fn validate_register_rejects_invalid_email() {
        let payload = RegisterRequest {
            email: "invalid-email".to_string(),
            password: "password123".to_string(),
        };

        let result = validate_register_payload(&payload);
        assert!(matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("invalid email")));
    }

    #[test]
    fn validate_register_rejects_short_password() {
        let payload = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "short".to_string(),
        };

        let result = validate_register_payload(&payload);
        assert!(matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("at least 8")));
    }

    #[test]
    fn validate_register_rejects_password_without_number() {
        let payload = RegisterRequest {
            email: "user@example.com".to_string(),
            password: "passwordonly".to_string(),
        };

        let result = validate_register_payload(&payload);
        assert!(matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("letters and numbers")));
    }

    #[test]
    fn decode_token_rejects_wrong_secret() {
        let user_id = Uuid::new_v4();
        let token = create_access_token("expected", user_id, 5).expect("token");

        let result = decode_token("wrong-secret", &token);
        assert!(matches!(result, Err(AppError::Unauthorized)));
    }

    #[test]
    fn create_access_token_sets_future_expiry() {
        let secret = "another-test-secret";
        let user_id = Uuid::new_v4();

        let token = create_access_token(secret, user_id, 5).expect("token");
        let claims = decode_token(secret, &token).expect("claims");

        assert!(claims.exp >= Utc::now().timestamp() as usize);
    }
}
