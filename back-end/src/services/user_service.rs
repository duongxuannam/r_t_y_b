use crate::{error::AppError, models::auth::UserResponse, state::AppState};

pub async fn list_users(state: &AppState) -> Result<Vec<UserResponse>, AppError> {
    let users =
        sqlx::query_as::<_, UserResponse>("SELECT id, email, role FROM users ORDER BY email ASC")
            .fetch_all(&state.db)
            .await?;

    Ok(users)
}
