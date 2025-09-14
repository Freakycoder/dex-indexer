use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt, stream::SplitSink};
use std::sync::{Arc, Mutex};

type Client = SplitSink<WebSocket, Message>; // its just the another half of websocket. websocket.split() wala.
type Clients = Arc<Mutex<Vec<Client>>>;

#[derive(Clone)]
pub struct WebsocketManager {
    clients: Clients,
}

impl WebsocketManager {
    pub fn new() -> Self {
        
        Self {
            clients: Arc::new(Mutex::new(Vec::new()))
        }
    }

    pub fn get_route(&self) -> Router {
        Router::new()
            .route("/ws", get(websocket_handler))
            .with_state(self.clone())
    }

    pub async fn push(&self, msg: String) {
        let message = Message::Text(msg);
        let mut clients = self.clients.lock().unwrap();
        
        for client in clients.iter_mut() {
            let _ = client.send(msg).await;
        };
        
        println!("Message sent to {} clients", clients.len());
    }
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(manager): axum::extract::State<WebsocketManager>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, manager))
}

async fn handle_socket(socket: WebSocket, manager: WebsocketManager) {
    let (sender, mut receiver) = socket.split();
    
    let mut clients = manager.clients.lock().unwrap();
    clients.push(sender);
    println!("WebSocket client connected (total: {})", clients.len());
    
    // Just wait until client disconnects ()
    while receiver.next().await.is_some() {}
    
    println!("🔌 WebSocket client disconnected");
}