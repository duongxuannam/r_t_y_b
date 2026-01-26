use uuid::Uuid;

use crate::{
    error::AppError,
    models::todo::{CreateTodoRequest, ReorderTodosRequest, TodoResponse, UpdateTodoRequest},
    state::AppState,
};

const TODO_STATUSES: [&str; 3] = ["todo", "in_progress", "done"];

fn normalize_title(title: &str) -> Result<String, AppError> {
    let trimmed = title.trim();
    if trimmed.is_empty() {
        return Err(AppError::BadRequest("title is required".to_string()));
    }

    Ok(trimmed.to_string())
}

fn normalize_status(status: &str) -> Result<String, AppError> {
    let trimmed = status.trim().to_lowercase();
    if TODO_STATUSES.contains(&trimmed.as_str()) {
        return Ok(trimmed);
    }

    Err(AppError::BadRequest("invalid status".to_string()))
}

fn ensure_update_payload(payload: &UpdateTodoRequest) -> Result<Option<String>, AppError> {
    if payload.title.is_none()
        && payload.completed.is_none()
        && payload.status.is_none()
        && payload.position.is_none()
    {
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
        "SELECT id, user_id, title, completed, status, position, created_at, updated_at FROM todos WHERE user_id = $1 ORDER BY CASE status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 ELSE 4 END, position ASC, updated_at DESC",
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
    let status = match payload.status {
        Some(status) => normalize_status(&status)?,
        None => "todo".to_string(),
    };

    let position: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM todos WHERE user_id = $1 AND status = $2",
    )
    .bind(user_id)
    .bind(&status)
    .fetch_one(&state.db)
    .await?;

    let completed = status == "done";

    let todo = sqlx::query_as::<_, TodoResponse>(
        "INSERT INTO todos (id, user_id, title, completed, status, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, user_id, title, completed, status, position, created_at, updated_at",
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(title)
    .bind(completed)
    .bind(&status)
    .bind(position)
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
        "SELECT id, user_id, title, completed, status, position, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2",
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
    let mut status = match payload.status {
        Some(status) => Some(normalize_status(&status)?),
        None => None,
    };
    let mut completed = payload.completed;

    if completed.is_some() && status.is_none() {
        status = completed.map(|value| {
            if value {
                "done".to_string()
            } else {
                "todo".to_string()
            }
        });
    }

    if let Some(status_value) = status.as_deref() {
        if completed.is_none() {
            completed = Some(status_value == "done");
        }
    }

    let position = if let (Some(status_value), None) = (status.as_deref(), payload.position) {
        Some(
            sqlx::query_scalar(
                "SELECT COALESCE(MAX(position), -1) + 1 FROM todos WHERE user_id = $1 AND status = $2",
            )
            .bind(user_id)
            .bind(status_value)
            .fetch_one(&state.db)
            .await?,
        )
    } else {
        payload.position
    };

    let todo = sqlx::query_as::<_, TodoResponse>(
        "UPDATE todos SET title = COALESCE($1, title), completed = COALESCE($2, completed), status = COALESCE($3, status), position = COALESCE($4, position), updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING id, user_id, title, completed, status, position, created_at, updated_at",
    )
    .bind(title.as_deref())
    .bind(completed)
    .bind(status.as_deref())
    .bind(position)
    .bind(todo_id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(todo)
}

pub async fn delete_todo(state: &AppState, user_id: Uuid, todo_id: Uuid) -> Result<(), AppError> {
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

pub async fn reorder_todos(
    state: &AppState,
    user_id: Uuid,
    payload: ReorderTodosRequest,
) -> Result<(), AppError> {
    if payload.items.is_empty() {
        return Err(AppError::BadRequest("items is required".to_string()));
    }

    let mut tx = state.db.begin().await?;

    for item in payload.items {
        let status = normalize_status(&item.status)?;
        let completed = status == "done";
        let result = sqlx::query(
            "UPDATE todos SET status = $1, position = $2, completed = $3, updated_at = NOW() WHERE id = $4 AND user_id = $5",
        )
        .bind(status)
        .bind(item.position)
        .bind(completed)
        .bind(item.id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::NotFound);
        }
    }

    tx.commit().await?;
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

        assert!(
            matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("title is required"))
        );
    }

    #[test]
    fn ensure_update_payload_rejects_empty_request() {
        let payload = UpdateTodoRequest {
            title: None,
            completed: None,
            status: None,
            position: None,
        };

        let result = ensure_update_payload(&payload);

        assert!(
            matches!(result, Err(AppError::BadRequest(msg)) if msg.contains("nothing to update"))
        );
    }

    #[test]
    fn ensure_update_payload_normalizes_title() {
        let payload = UpdateTodoRequest {
            title: Some("   Updated title ".to_string()),
            completed: Some(true),
            status: None,
            position: None,
        };

        let normalized = ensure_update_payload(&payload).expect("normalized title");

        assert_eq!(normalized.as_deref(), Some("Updated title"));
    }
}
