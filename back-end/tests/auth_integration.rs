use std::num::NonZeroU32;

use todo_api::{
    error::AppError,
    models::auth::{LoginRequest, RegisterRequest},
    services::auth_service,
    state::{AppState, EmailConfig, JwtConfig},
};
use uuid::Uuid;

#[tokio::test]
async fn register_login_refresh_logout_flow() -> Result<(), AppError> {
    let run_integration = std::env::var("RUN_INTEGRATION_TESTS")
        .ok()
        .map(|value| value == "1" || value.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if !run_integration {
        eprintln!("Skipping integration test: set RUN_INTEGRATION_TESTS=1 to enable.");
        return Ok(());
    }

    let database_url = std::env::var("DATABASE_URL").map_err(|err| {
        eprintln!("DATABASE_URL not set: {err}");
        AppError::Internal
    })?;
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|err| {
            eprintln!("migration failed: {err}");
            AppError::Internal
        })?;

    let state = AppState {
        db: pool,
        jwt: JwtConfig {
            secret: "test-secret-which-is-long-enough-1234567890".into(),
            access_ttl_minutes: 15,
            refresh_ttl_days: 7,
        },
        email: EmailConfig {
            smtp_host: "smtp.example.com".into(),
            smtp_port: 587,
            smtp_username: "user".into(),
            smtp_password: "pass".into(),
            from_email: "no-reply@example.com".into(),
            from_name: "Todo App".into(),
            reset_url_base: "http://localhost:5173".into(),
            reset_ttl_minutes: 30,
        },
        cors_allowed_origins: Vec::new(),
        rate_limit_per_second: NonZeroU32::new(10).unwrap(),
        rate_limit_burst: NonZeroU32::new(20).unwrap(),
        refresh_cookie_name: "todo_refresh".into(),
        refresh_cookie_secure: false,
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

    let (register_response, register_refresh_token) = register_response;
    assert_eq!(register_response.user.email, email);
    assert!(!register_response.access_token.is_empty());
    assert!(!register_refresh_token.is_empty());

    let login_response = auth_service::login(
        &state,
        LoginRequest {
            email: email.clone(),
            password: password.into(),
        },
    )
    .await?;

    let (login_response, login_refresh_token) = login_response;
    assert_eq!(login_response.user.email, email);
    assert!(!login_response.access_token.is_empty());
    assert!(!login_refresh_token.is_empty());

    let refreshed = auth_service::refresh(&state, &login_refresh_token).await?;

    let (refreshed, refreshed_token) = refreshed;
    assert_eq!(refreshed.user.email, email);
    assert_ne!(refreshed.access_token, login_response.access_token);
    assert_ne!(refreshed_token, login_refresh_token);

    auth_service::logout(&state, &refreshed_token).await?;

    let reuse_after_logout = auth_service::refresh(&state, &refreshed_token).await;

    assert!(matches!(reuse_after_logout, Err(AppError::Unauthorized)));

    Ok(())
}
