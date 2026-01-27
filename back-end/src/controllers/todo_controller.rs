use axum::{
    Json, Router,
    extract::{Path, State},
    routing::{get, put},
};
use uuid::Uuid;

use crate::{
    controllers::extractors::AuthUser,
    error::AppError,
    models::todo::{CreateTodoRequest, ReorderTodosRequest, TodoResponse, UpdateTodoRequest},
    services::todo_service,
    state::AppState,
};

#[utoipa::path(
    get,
    path = "/todos",
    tag = "todos",
    responses(
        (status = 200, body = [TodoResponse]),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn list_todos(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<TodoResponse>>, AppError> {
    let todos = todo_service::list_todos(&state, user.user_id).await?;
    Ok(Json(todos))
}

#[utoipa::path(
    post,
    path = "/todos",
    tag = "todos",
    request_body = CreateTodoRequest,
    responses(
        (status = 201, body = TodoResponse),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn create_todo(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<CreateTodoRequest>,
) -> Result<(axum::http::StatusCode, Json<TodoResponse>), AppError> {
    let todo = todo_service::create_todo(&state, user.user_id, payload).await?;
    Ok((axum::http::StatusCode::CREATED, Json(todo)))
}

#[utoipa::path(
    get,
    path = "/todos/{id}",
    tag = "todos",
    params(("id" = String, Path, description = "Todo ID")),
    responses(
        (status = 200, body = TodoResponse),
        (status = 404, body = crate::error::ErrorResponse)
    )
)]
pub async fn get_todo(
    State(state): State<AppState>,
    user: AuthUser,
    Path(todo_id): Path<Uuid>,
) -> Result<Json<TodoResponse>, AppError> {
    let todo = todo_service::get_todo(&state, user.user_id, todo_id).await?;
    Ok(Json(todo))
}

#[utoipa::path(
    put,
    path = "/todos/{id}",
    tag = "todos",
    request_body = UpdateTodoRequest,
    params(("id" = String, Path, description = "Todo ID")),
    responses(
        (status = 200, body = TodoResponse),
        (status = 400, body = crate::error::ErrorResponse),
        (status = 404, body = crate::error::ErrorResponse)
    )
)]
pub async fn update_todo(
    State(state): State<AppState>,
    user: AuthUser,
    Path(todo_id): Path<Uuid>,
    Json(payload): Json<UpdateTodoRequest>,
) -> Result<Json<TodoResponse>, AppError> {
    let todo = todo_service::update_todo(&state, user.user_id, todo_id, payload).await?;
    Ok(Json(todo))
}

#[utoipa::path(
    delete,
    path = "/todos/{id}",
    tag = "todos",
    params(("id" = String, Path, description = "Todo ID")),
    responses(
        (status = 204),
        (status = 404, body = crate::error::ErrorResponse)
    )
)]
pub async fn delete_todo(
    State(state): State<AppState>,
    user: AuthUser,
    Path(todo_id): Path<Uuid>,
) -> Result<axum::http::StatusCode, AppError> {
    todo_service::delete_todo(&state, user.user_id, todo_id).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

#[utoipa::path(
    put,
    path = "/todos/reorder-items",
    tag = "todos",
    request_body = ReorderTodosRequest,
    responses(
        (status = 204),
        (status = 400, body = crate::error::ErrorResponse),
        (status = 404, body = crate::error::ErrorResponse)
    )
)]
pub async fn reorder_todos(
    State(state): State<AppState>,
    user: AuthUser,
    Json(payload): Json<ReorderTodosRequest>,
) -> Result<axum::http::StatusCode, AppError> {
    tracing::info!(
        user_id = %user.user_id,
        item_count = payload.items.len(),
        "reorder todos request"
    );
    if payload.items.is_empty() {
        tracing::warn!(user_id = %user.user_id, "reorder todos request had empty items");
    }
    if payload.items.len() > 200 {
        tracing::warn!(
            user_id = %user.user_id,
            item_count = payload.items.len(),
            "reorder todos request has a large payload"
        );
    }
    todo_service::reorder_todos(&state, user.user_id, payload).await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/todos", get(list_todos).post(create_todo))
        .route("/todos/reorder-items", put(reorder_todos))
        .route(
            "/todos/:id",
            get(get_todo).put(update_todo).delete(delete_todo),
        )
}
