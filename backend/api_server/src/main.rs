use axum::{response::Json, routing::get, Router};
use serde_json::{json, Value};
use shared::websocket::ws_manager::WebsocketManager;
use dotenvy::dotenv;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("🚀 Starting API server...");
    println!("Loading environment variables...");
    dotenv().ok();
    
    if let Ok(redis_url) = std::env::var("REDIS_URL") {
        println!("✅ Redis URL found: {}", redis_url);
    } else {
        println!("❌ REDIS_URL environment variable not found");
    }

    println!("Creating WebSocket manager...");
    let ws_manager = WebsocketManager::new();
    println!("✅ WebSocket manager created");

    println!("Setting up routes...");
    let api_routes = Router::new()
        .route("/", get(handler))
        .route("/health", get(health_check));

    let ws_routes = ws_manager.get_route();

    let app = Router::new().nest("/api", api_routes).merge(ws_routes);
    
    println!("Binding to 0.0.0.0:8080...");
    let listener = match tokio::net::TcpListener::bind("0.0.0.0:8080").await {
        Ok(listener) => {
            println!("✅ Successfully bound to port 8080");
            listener
        },
        Err(e) => {
            println!("❌ Failed to bind to port 8080: {}", e);
            return Err(e.into());
        }
    };

    println!("🚀 Server starting on port 8080...");
    match axum::serve(listener, app).await {
        Ok(_) => {
            println!("✅ Server started successfully");
            Ok(())
        },
        Err(e) => {
            println!("❌ Server failed to start: {}", e);
            Err(e.into())
        }
    }
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
