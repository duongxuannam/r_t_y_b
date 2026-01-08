use std::{
    net::SocketAddr,
    path::{Path, PathBuf},
    sync::Arc,
};

use axum::http::{HeaderValue, Method, header};
use axum::{Router, routing::get};
use axum_prometheus::PrometheusMetricLayer;
use controllers::{auth_controller, docs_controller, health_controller, todo_controller};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use state::AppState;
use tower_governor::{
    GovernorLayer, governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor,
};
use tower_http::{
    cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer},
    request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer},
    services::{ServeDir, ServeFile},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
mod controllers;
mod error;

mod models;
mod services;
mod state;

#[derive(OpenApi)]
#[openapi(
    paths(
        auth_controller::register,
        auth_controller::login,
        auth_controller::refresh,
        auth_controller::logout,
        auth_controller::forgot,
        auth_controller::reset,
        todo_controller::list_todos,
        todo_controller::create_todo,
        todo_controller::get_todo,
        todo_controller::update_todo,
        todo_controller::delete_todo,
        health_controller::health_check,
        docs_controller::scalar_ui
    ),
    components(schemas(
        models::auth::RegisterRequest,
        models::auth::LoginRequest,
        models::auth::RefreshRequest,
        models::auth::ForgotPasswordRequest,
        models::auth::ResetPasswordRequest,
        models::auth::AuthResponse,
        models::auth::UserResponse,
        models::auth::MessageResponse,
        models::todo::CreateTodoRequest,
        models::todo::UpdateTodoRequest,
        models::todo::TodoResponse,
        error::ErrorResponse,
        controllers::health_controller::HealthResponse
    )),
    tags(
        (name = "auth", description = "Authentication"),
        (name = "todos", description = "Todo management"),
        (name = "health", description = "Health check"),
        (name = "docs", description = "API documentation")
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    load_env()?;

    if let Some(command) = std::env::args().nth(1) {
        if command == "test" {
            eprintln!(
                "`cargo run test` passes a `test` arg to the server. Use `cargo test` instead."
            );
            return Ok(());
        }
    }

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env().add_directive("info".parse()?))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    let state = AppState::from_env(pool)?;

    let cors_layer = build_cors_layer(&state.cors_allowed_origins);

    let governor_conf = GovernorConfigBuilder::default()
        .per_second(state.rate_limit_per_second.get() as u64)
        .burst_size(state.rate_limit_burst.get())
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .expect("valid governor config");
    let governor_conf = Arc::new(governor_conf);

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_route_handle = metric_handle.clone();

    let static_service = build_static_service();

    let api = Router::new()
        .route("/health", get(health_controller::health_check))
        .route(
            "/metrics",
            get(move || async move { metrics_route_handle.render() }),
        )
        .merge(auth_controller::routes())
        .merge(todo_controller::routes())
        .merge(docs_controller::routes(ApiDoc::openapi()));

    let app = Router::new()
        .nest("/api", api)
        .fallback_service(static_service)
        .layer(GovernorLayer {
            config: governor_conf.clone(),
        })
        .layer(prometheus_layer)
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().include_headers(true))
                .on_response(DefaultOnResponse::new().include_headers(true)),
        )
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .layer(cors_layer)
        .with_state(state);

    let bind_addr: SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
        .parse()?;

    tracing::info!("listening on {}", bind_addr);
    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

fn build_cors_layer(origins: &[HeaderValue]) -> CorsLayer {
    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins.iter().cloned()))
        .allow_methods(AllowMethods::list([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
        ]))
        .allow_headers(AllowHeaders::list([
            header::ACCEPT,
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
        ]))
}

fn build_static_service() -> ServeDir<ServeFile> {
    let dist_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("front-end")
        .join("dist");
    let index_file = dist_dir.join("index.html");
    ServeDir::new(dist_dir).fallback(ServeFile::new(index_file))
}

fn load_env() -> Result<(), Box<dyn std::error::Error>> {
    let manifest_env = Path::new(env!("CARGO_MANIFEST_DIR")).join(".env");
    let env_path = if manifest_env.exists() {
        manifest_env
    } else {
        PathBuf::from(".env")
    };

    if env_path.exists() {
        if dotenvy::from_path(&env_path).is_err() {
            load_env_fallback(&env_path)?;
        }
    } else {
        let _ = dotenv();
    }

    Ok(())
}

fn load_env_fallback(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let contents = std::fs::read_to_string(path)?;
    for line in contents.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            if std::env::var(key).is_err() {
                // Safe at startup before spawning background tasks.
                unsafe {
                    std::env::set_var(key, value);
                }
            }
        }
    }
    Ok(())
}
