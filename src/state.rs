use std::num::NonZeroU32;

use axum::http::HeaderValue;
use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
    pub jwt: JwtConfig,
    pub email: EmailConfig,
    pub cors_allowed_origins: Vec<HeaderValue>,
    pub rate_limit_per_second: NonZeroU32,
    pub rate_limit_burst: NonZeroU32,
}

#[derive(Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub access_ttl_minutes: i64,
    pub refresh_ttl_days: i64,
}

#[derive(Clone)]
pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub from_name: String,
    pub reset_url_base: String,
    pub reset_ttl_minutes: i64,
}

impl AppState {
    pub fn from_env(db: Pool<Postgres>) -> Result<Self, Box<dyn std::error::Error>> {
        let jwt_secret = require_env("JWT_SECRET")?;
        if jwt_secret.len() < 32 {
            return Err("JWT_SECRET must be at least 32 characters".into());
        }

        let access_ttl_minutes: i64 = std::env::var("ACCESS_TOKEN_TTL_MIN")
            .unwrap_or_else(|_| "15".to_string())
            .parse()
            .map_err(|_| "ACCESS_TOKEN_TTL_MIN must be a positive integer")?;
        if access_ttl_minutes <= 0 {
            return Err("ACCESS_TOKEN_TTL_MIN must be greater than zero".into());
        }

        let refresh_ttl_days: i64 = std::env::var("REFRESH_TOKEN_TTL_DAYS")
            .unwrap_or_else(|_| "7".to_string())
            .parse()
            .map_err(|_| "REFRESH_TOKEN_TTL_DAYS must be a positive integer")?;
        if refresh_ttl_days <= 0 {
            return Err("REFRESH_TOKEN_TTL_DAYS must be greater than zero".into());
        }

        let smtp_host = require_env("SMTP_HOST")?;
        let smtp_port: u16 = std::env::var("SMTP_PORT")
            .unwrap_or_else(|_| "587".to_string())
            .parse()
            .map_err(|_| "SMTP_PORT must be a valid integer")?;
        let smtp_username = require_env("SMTP_USERNAME")?;
        let smtp_password = require_env("SMTP_PASSWORD")?;
        let from_email = require_env("SMTP_FROM")?;
        let from_name = std::env::var("SMTP_FROM_NAME").unwrap_or_else(|_| "Todo App".to_string());
        let reset_url_base = require_env("PASSWORD_RESET_URL_BASE")?;
        let reset_ttl_minutes: i64 = std::env::var("PASSWORD_RESET_TTL_MIN")
            .unwrap_or_else(|_| "30".to_string())
            .parse()
            .map_err(|_| "PASSWORD_RESET_TTL_MIN must be a positive integer")?;
        if reset_ttl_minutes <= 0 {
            return Err("PASSWORD_RESET_TTL_MIN must be greater than zero".into());
        }

        let cors_allowed_origins = parse_allowed_origins(
            std::env::var("ALLOWED_ORIGINS").ok(),
            &["http://localhost:3000", "http://localhost:5173"],
        )?;

        let rate_limit_per_second = parse_non_zero(
            "RATE_LIMIT_PER_SECOND",
            std::env::var("RATE_LIMIT_PER_SECOND").ok(),
            5,
        )?;
        let rate_limit_burst = parse_non_zero(
            "RATE_LIMIT_BURST",
            std::env::var("RATE_LIMIT_BURST").ok(),
            10,
        )?;

        Ok(Self {
            db,
            jwt: JwtConfig {
                secret: jwt_secret,
                access_ttl_minutes,
                refresh_ttl_days,
            },
            email: EmailConfig {
                smtp_host,
                smtp_port,
                smtp_username,
                smtp_password,
                from_email,
                from_name,
                reset_url_base,
                reset_ttl_minutes,
            },
            cors_allowed_origins,
            rate_limit_per_second,
            rate_limit_burst,
        })
    }
}

fn require_env(name: &str) -> Result<String, Box<dyn std::error::Error>> {
    std::env::var(name).map_err(|_| format!("Missing required env var: {name}").into())
}

fn parse_non_zero(
    name: &str,
    raw: Option<String>,
    default: u32,
) -> Result<NonZeroU32, Box<dyn std::error::Error>> {
    let value = match raw {
        Some(val) => val
            .parse()
            .map_err(|_| format!("{name} must be a positive integer"))?,
        None => default,
    };

    NonZeroU32::new(value).ok_or_else(|| format!("{name} must be greater than zero").into())
}

fn parse_allowed_origins(
    raw: Option<String>,
    defaults: &[&str],
) -> Result<Vec<HeaderValue>, Box<dyn std::error::Error>> {
    let entries: Vec<String> = match raw {
        Some(list) => list
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect(),
        None => defaults.iter().map(|s| s.to_string()).collect(),
    };

    if entries.is_empty() {
        return Err("At least one allowed origin must be provided".into());
    }

    entries
        .into_iter()
        .map(|origin| {
            HeaderValue::from_str(&origin).map_err(|_| format!("Invalid origin: {origin}").into())
        })
        .collect()
}
