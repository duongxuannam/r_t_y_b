use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateTodoRequest {
    pub title: String,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct UpdateTodoRequest {
    pub title: Option<String>,
    pub completed: Option<bool>,
}

#[derive(Debug, Serialize, FromRow, utoipa::ToSchema)]
pub struct TodoResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub completed: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
