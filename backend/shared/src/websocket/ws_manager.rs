use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::{broadcast, Mutex};

#[derive(Clone, Debug)]
pub struct WebsocketManager {
    sender: broadcast::Sender<String>,
    client_count: Arc<Mutex<usize>>,
}

impl WebsocketManager {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self {
            sender,
            client_count: Arc::new(Mutex::new(0)),
        }
    }

    pub fn get_route(&self) -> Router {
        Router::new()
            .route("/ws", get(websocket_handler))
            .with_state(self.clone())
    }

    pub async fn push(&self, msg: String) {
        let count = *self.client_count.lock().await;
        
        match self.sender.send(msg) {
            Ok(_) => {
                println!("📤 Message sent to {} clients", count);
            }
            Err(_) => {
                println!("⚠️ No clients connected to receive message");
            }
        }
    }

    async fn increment_client_count(&self) {
        let mut count = self.client_count.lock().await;
        *count += 1;
        println!("🔗 WebSocket client connected (total: {})", *count);
    }

    async fn decrement_client_count(&self) {
        let mut count = self.client_count.lock().await;
        *count = count.saturating_sub(1);
        println!("🔌 WebSocket client disconnected (total: {})", *count);
    }
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(manager): axum::extract::State<WebsocketManager>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, manager))
}

async fn handle_socket(socket: WebSocket, manager: WebsocketManager) {
    let (mut socket_sender, mut socket_receiver) = socket.split();
    let mut receiver = manager.sender.subscribe();

    // Increment client count
    manager.increment_client_count().await;

    // Task to send messages to this client
    let send_task = tokio::spawn(async move {
        while let Ok(message) = receiver.recv().await {
            if socket_sender.send(Message::Text(message.into())).await.is_err() {
                break; // Client disconnected
            }
        }
    });

    // Task to handle client disconnection
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = socket_receiver.next().await {
            if msg.is_err() {
                break; // Client disconnected
            }
        }
    });

    // Wait for either task to complete (client disconnect)
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Decrement client count
    manager.decrement_client_count().await;
}