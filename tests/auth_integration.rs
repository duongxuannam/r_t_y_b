use todo_api::{
    error::AppError,
    models::auth::{LoginRequest, RefreshRequest, RegisterRequest},
    services::auth_service,
    state::{AppState, JwtConfig},
};
use std::num::NonZeroU32;
use uuid::Uuid;

#[sqlx::test(migrations = "./migrations")]
async fn register_login_refresh_logout_flow(pool: sqlx::PgPool) -> Result<(), AppError> {
    let state = AppState {
        db: pool,
        jwt: JwtConfig {
            secret: "test-secret-which-is-long-enough-1234567890".into(),
            access_ttl_minutes: 15,
            refresh_ttl_days: 7,
        },
        cors_allowed_origins: Vec::new(),
        rate_limit_per_second: NonZeroU32::new(10).unwrap(),
        rate_limit_burst: NonZeroU32::new(20).unwrap(),
    };

    let email = format!("user+{}@example.com", Uuid::new_v4());
    let password = "P@ssword123";

    let register_response = auth_service::register(
        &state,
        RegisterRequest {
            email: email.clone(),
            password: password.into(),
        },
    )
    .await?;

    assert_eq!(register_response.user.email, email);
    assert!(!register_response.access_token.is_empty());
    assert!(!register_response.refresh_token.is_empty());

    let login_response = auth_service::login(
        &state,
        LoginRequest {
            email: email.clone(),
            password: password.into(),
        },
    )
    .await?;

    assert_eq!(login_response.user.email, email);
    assert!(!login_response.access_token.is_empty());
    assert!(!login_response.refresh_token.is_empty());

    let refreshed = auth_service::refresh(
        &state,
        RefreshRequest {
            refresh_token: login_response.refresh_token.clone(),
        },
    )
    .await?;

    assert_eq!(refreshed.user.email, email);
    assert_ne!(refreshed.access_token, login_response.access_token);
    assert_ne!(refreshed.refresh_token, login_response.refresh_token);

    auth_service::logout(
        &state,
        RefreshRequest {
            refresh_token: refreshed.refresh_token.clone(),
        },
    )
    .await?;

    let reuse_after_logout = auth_service::refresh(
        &state,
        RefreshRequest {
            refresh_token: refreshed.refresh_token,
        },
    )
    .await;

    assert!(matches!(reuse_after_logout, Err(AppError::Unauthorized)));

    Ok(())
}
