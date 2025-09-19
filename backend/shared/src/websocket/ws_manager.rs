// Replace your entire shared/src/websocket/ws_manager.rs with this:

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};
use futures::{stream::SplitSink, SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;

type WebSocketSender = SplitSink<WebSocket, Message>;

// Global shared state for WebSocket connections
lazy_static::lazy_static! {
    static ref WEBSOCKET_CONNECTIONS: Arc<RwLock<HashMap<usize, Arc<Mutex<WebSocketSender>>>>> = 
        Arc::new(RwLock::new(HashMap::new()));
    static ref CONNECTION_COUNTER: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));
}

#[derive(Clone, Debug)]
pub struct WebsocketManager {
    client_count: Arc<Mutex<usize>>,
}

impl WebsocketManager {
    pub fn new() -> Self {
        Self {
            client_count: Arc::new(Mutex::new(0)),
        }
    }

    pub fn get_route(&self) -> Router {
        Router::new()
            .route("/ws", get(websocket_handler))
            .with_state(self.clone())
    }

    pub async fn push(&self, msg: String) {
        let connections = WEBSOCKET_CONNECTIONS.read().await;
        let count = connections.len();
        
        println!("📤 Attempting to send message to {} connections", count);
        
        if count == 0 {
            println!("⚠️ No WebSocket connections available");
            return;
        }

        let mut failed_connections = Vec::new();
        let mut success_count = 0;

        for (id, sender) in connections.iter() {
            let mut sender_guard = sender.lock().await;
            match sender_guard.send(Message::Text(msg.clone().into())).await {
                Ok(_) => {
                    success_count += 1;
                }
                Err(e) => {
                    println!("❌ Failed to send to connection {}: {}", id, e);
                    failed_connections.push(*id);
                }
            }
        }

        drop(connections); // Release read lock before acquiring write lock

        // Remove failed connections
        if !failed_connections.is_empty() {
            let mut connections = WEBSOCKET_CONNECTIONS.write().await;
            for id in failed_connections {
                connections.remove(&id);
                println!("🗑️ Removed failed connection {}", id);
            }
        }

        println!("✅ Message sent to {}/{} connections", success_count, count);
    }

    async fn add_connection(&self, sender: WebSocketSender) -> usize {
        let mut counter = CONNECTION_COUNTER.lock().await;
        *counter += 1;
        let connection_id = *counter;
        drop(counter);

        let mut connections = WEBSOCKET_CONNECTIONS.write().await;
        connections.insert(connection_id, Arc::new(Mutex::new(sender)));
        
        let mut client_count = self.client_count.lock().await;
        *client_count += 1;
        
        println!("🔗 WebSocket connection {} added (total: {})", connection_id, *client_count);
        connection_id
    }

    async fn remove_connection(&self, connection_id: usize) {
        let mut connections = WEBSOCKET_CONNECTIONS.write().await;
        connections.remove(&connection_id);
        
        let mut client_count = self.client_count.lock().await;
        *client_count = client_count.saturating_sub(1);
        
        println!("🔌 WebSocket connection {} removed (total: {})", connection_id, *client_count);
    }
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(manager): axum::extract::State<WebsocketManager>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, manager))
}

async fn handle_socket(socket: WebSocket, manager: WebsocketManager) {
    let (socket_sender, mut socket_receiver) = socket.split();
    
    // Add this connection to the global pool
    let connection_id = manager.add_connection(socket_sender).await;
    
    // Handle incoming messages (mainly for disconnect detection)
    while let Some(msg_result) = socket_receiver.next().await {
        if msg_result.is_err() {
            break;
        }
        // Handle incoming messages if needed
    }
    
    // Remove connection when client disconnects
    manager.remove_connection(connection_id).await;
}