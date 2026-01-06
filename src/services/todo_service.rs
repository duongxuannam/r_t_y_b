use uuid::Uuid;

use crate::{
    error::AppError,
    models::todo::{CreateTodoRequest, TodoResponse, UpdateTodoRequest},
    state::AppState,
};

fn normalize_title(title: &str) -> Result<String, AppError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    Ok(trimmed.to_string())
}

fn ensure_update_payload(payload: &UpdateTodoRequest) -> Result<Option<String>, AppError> {
    if payload.title.is_none() && payload.completed.is_none() {
        return Err(AppError::BadRequest("nothing to update".to_string()));
    }

    let normalized_title = match &payload.title {
        Some(title) => Some(normalize_title(title)?),
        None => None,
    };

    Ok(normalized_title)
}

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
    let title = normalize_title(&payload.title)?;

    let todo = sqlx::query_as::<_, TodoResponse>(
        "INSERT INTO todos (id, user_id, title) VALUES ($1, $2, $3) RETURNING id, user_id, title, completed, created_at, updated_at",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(title)
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
    let title = ensure_update_payload(&payload)?;

    let todo = sqlx::query_as::<_, TodoResponse>(
        "UPDATE todos SET title = COALESCE($1, title), completed = COALESCE($2, completed), updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, user_id, title, completed, created_at, updated_at",
    )
    .bind(title.as_deref())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_title_trims_and_validates() {
        let title = "   Write tests  ";
        let normalized = normalize_title(title).expect("normalized title");

        assert_eq!(normalized, "Write tests");
    }

    #[test]
    fn normalize_title_rejects_empty() {
        let result = normalize_title("   ");

        assert!(matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("title is required")));
    }

    #[test]
    fn ensure_update_payload_rejects_empty_request() {
        let payload = UpdateTodoRequest {
            title: None,
            completed: None,
        };

        let result = ensure_update_payload(&payload);

        assert!(matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("nothing to update")));
    }

    #[test]
    fn ensure_update_payload_normalizes_title() {
        let payload = UpdateTodoRequest {
            title: Some("   Updated title ".to_string()),
            completed: Some(true),
        };

        let normalized = ensure_update_payload(&payload).expect("normalized title");

        assert_eq!(normalized.as_deref(), Some("Updated title"));
    }
}
