use std::collections::HashMap;
use std::sync::Arc;

use axum::extract::ws::Message;
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct TodoRealtimeHub {
    clients: Arc<RwLock<HashMap<Uuid, Vec<mpsc::UnboundedSender<Message>>>>>,
}

impl TodoRealtimeHub {
    pub async fn subscribe(&self, user_id: Uuid) -> mpsc::UnboundedReceiver<Message> {
        let (tx, rx) = mpsc::unbounded_channel();
        let mut clients = self.clients.write().await;
        clients.entry(user_id).or_default().push(tx);
        rx
    }

    pub async fn broadcast_todo_change(&self, actor_id: Uuid, targets: &[Uuid], payload: String) {
        let mut recipients = targets.to_vec();
        if !recipients.contains(&actor_id) {
            recipients.push(actor_id);
        }

        let mut clients = self.clients.write().await;
        for user_id in recipients {
            if let Some(user_clients) = clients.get_mut(&user_id) {
                user_clients.retain(|tx| tx.send(Message::Text(payload.clone())).is_ok());
            }
        }
    }

    pub async fn remove_all_for_user(&self, user_id: Uuid) {
        let mut clients = self.clients.write().await;
        clients.remove(&user_id);
    }
}
