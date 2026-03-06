use axum::{
    Router,
    extract::{State, WebSocketUpgrade},
    response::Response,
    routing::get,
};
use futures_util::{SinkExt, StreamExt};

use crate::{controllers::extractors::AuthUser, state::AppState};

pub async fn todo_realtime_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    user: AuthUser,
) -> Response {
    ws.on_upgrade(move |socket| async move {
        let user_id = user.user_id;
        let hub = state.todo_realtime_hub.clone();
        let mut rx = hub.subscribe(user_id).await;

        let (mut sender, mut receiver) = socket.split();

        let send_task = tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if sender.send(message).await.is_err() {
                    break;
                }
            }
        });

        while receiver.next().await.is_some() {}

        send_task.abort();
        hub.remove_all_for_user(user_id).await;
    })
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/todos/stream", get(todo_realtime_ws))
}
