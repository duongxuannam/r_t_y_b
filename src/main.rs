use std::net::SocketAddr;

use axum::{Router, routing::get};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
mod controllers;
mod error;
mod models;
mod services;
mod state;

use controllers::{auth_controller, docs_controller, health_controller, todo_controller};
use state::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(
        auth_controller::register,
        auth_controller::login,
        auth_controller::refresh,
        auth_controller::logout,
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
        models::auth::AuthResponse,
        models::auth::UserResponse,
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
    dotenv().ok();

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

    let app = Router::new()
        .route("/health", get(health_controller::health_check))
        .merge(auth_controller::routes())
        .merge(todo_controller::routes())
        .merge(docs_controller::routes(ApiDoc::openapi()))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let bind_addr: SocketAddr = std::env::var("BIND_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
        .parse()?;

    tracing::info!("listening on {}", bind_addr);
    axum::serve(tokio::net::TcpListener::bind(bind_addr).await?, app).await?;

    Ok(())
}
