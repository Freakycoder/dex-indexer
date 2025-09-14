use axum::{extract::{ws::{WebSocket, WebSocketUpgrade}}, response::Response, routing::get, Router};
use shared::websocket::ws_manager::WebsocketManager;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {

    println!("Starting API server...");

    let ws_manager = WebsocketManager::new();

    let api_routes  = Router::new()
    .route("/", get(handler));

    let ws_route = ws_manager.get_route();

    let app = Router::new()
    .nest("api", api_routes)
    .merge(ws_route);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;
    println!("Server runnning at port 3001");

    axum::serve(listener,api_routes).await?;
    Ok(())
}
