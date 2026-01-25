use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateTodoRequest {
    pub title: String,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateTodoRequest {
    pub title: Option<String>,
    pub completed: Option<bool>,
    pub status: Option<String>,
    pub position: Option<i32>,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ReorderTodoItem {
    pub id: Uuid,
    pub status: String,
    pub position: i32,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ReorderTodosRequest {
    pub items: Vec<ReorderTodoItem>,
}

#[derive(Debug, Serialize, FromRow, utoipa::ToSchema)]
pub struct TodoResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub completed: bool,
    pub status: String,
    pub position: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
