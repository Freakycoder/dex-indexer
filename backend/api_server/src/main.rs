use axum::{response::Json, routing::get, Router};
use serde_json::{json, Value};
use shared::websocket::ws_manager::WebsocketManager;
use dotenvy::dotenv;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenv().ok();
    println!("🚀 Starting API server...");

    let ws_manager = WebsocketManager::new();

    let api_routes = Router::new()
        .route("/", get(handler))
        .route("/health", get(health_check));

    let ws_routes = ws_manager.get_route();

    let app = Router::new().nest("/api", api_routes).merge(ws_routes);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;
    println!("Server running at port 3001");

    axum::serve(listener, app).await?;
    Ok(())
}

async fn handler() -> Json<Value> {
    Json(json!({
        "message": "Transaction Tracker API",
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "websocket": "/ws"
        }
    }))
}

async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "service": "transaction-tracker-api"
    }))
}
