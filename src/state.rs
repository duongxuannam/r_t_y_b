use sqlx::{Pool, Postgres};

#[derive(Clone)]
pub struct AppState {
    pub db: Pool<Postgres>,
    pub jwt: JwtConfig,
}

#[derive(Clone)]
pub struct JwtConfig {
    pub secret: String,
    pub access_ttl_minutes: i64,
    pub refresh_ttl_days: i64,
}

impl AppState {
    pub fn from_env(db: Pool<Postgres>) -> Result<Self, Box<dyn std::error::Error>> {
        let jwt_secret = std::env::var("JWT_SECRET")?;
        let access_ttl_minutes = std::env::var("ACCESS_TOKEN_TTL_MIN")
            .unwrap_or_else(|_| "15".to_string())
            .parse()?;
        let refresh_ttl_days = std::env::var("REFRESH_TOKEN_TTL_DAYS")
            .unwrap_or_else(|_| "7".to_string())
            .parse()?;

        Ok(Self {
            db,
            jwt: JwtConfig {
                secret: jwt_secret,
                access_ttl_minutes,
                refresh_ttl_days,
            },
        })
    }
}
