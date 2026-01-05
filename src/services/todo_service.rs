use uuid::Uuid;

use crate::{
    error::AppError,
    models::todo::{CreateTodoRequest, TodoResponse, UpdateTodoRequest},
    state::AppState,
};

pub async fn list_todos(state: &AppState, user_id: Uuid) -> Result<Vec<TodoResponse>, AppError> {
    let todos = sqlx::query_as::<_, TodoResponse>(
        "SELECT id, user_id, title, completed, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY created_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(todos)
}

pub async fn create_todo(
    state: &AppState,
    user_id: Uuid,
    payload: CreateTodoRequest,
) -> Result<TodoResponse, AppError> {
    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    let todo = sqlx::query_as::<_, TodoResponse>(
        "INSERT INTO todos (id, user_id, title) VALUES ($1, $2, $3) RETURNING id, user_id, title, completed, created_at, updated_at",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(payload.title.trim())
    .fetch_one(&state.db)
    .await?;

    Ok(todo)
}

pub async fn get_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<TodoResponse, AppError> {
    let todo = sqlx::query_as::<_, TodoResponse>(
        "SELECT id, user_id, title, completed, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2",
    )
    .bind(todo_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(todo)
}

pub async fn update_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
    payload: UpdateTodoRequest,
) -> Result<TodoResponse, AppError> {
    if payload.title.is_none() && payload.completed.is_none() {
        return Err(AppError::BadRequest("nothing to update".to_string()));
    }

    let todo = sqlx::query_as::<_, TodoResponse>(
        "UPDATE todos SET title = COALESCE($1, title), completed = COALESCE($2, completed), updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, user_id, title, completed, created_at, updated_at",
    )
    .bind(payload.title.as_deref())
    .bind(payload.completed)
    .bind(todo_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(todo)
}

pub async fn delete_todo(
    state: &AppState,
    user_id: Uuid,
    todo_id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query("DELETE FROM todos WHERE id = $1 AND user_id = $2")
        .bind(todo_id)
        .bind(user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }

    Ok(())
}
