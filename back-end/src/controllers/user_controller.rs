use axum::{Json, Router, extract::State, routing::get};

use crate::{
    controllers::extractors::AuthUser, error::AppError, models::auth::UserResponse,
    services::user_service, state::AppState,
};

#[utoipa::path(
    get,
    path = "/users",
    tag = "users",
    responses(
        (status = 200, body = [UserResponse]),
        (status = 401, body = crate::error::ErrorResponse)
    )
)]
pub async fn list_users(
    State(state): State<AppState>,
    _user: AuthUser,
) -> Result<Json<Vec<UserResponse>>, AppError> {
    let users = user_service::list_users(&state).await?;
    Ok(Json(users))
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/users", get(list_users))
}
