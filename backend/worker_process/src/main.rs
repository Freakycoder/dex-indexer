use shared::{redis::{worker::QueueWorker, queue_manager::QueueManager}, websocket::ws_manager::WebsocketManager};

#[tokio::main]
async fn main() -> Result<()> {
    println!("Starting queue worker");
    let queue = QueueManager::new()?;
    let ws_manager = WebsocketManager::new();
    let worker = QueueWorker::new(queue, ws_manager);

    worker.start_processing().await;
    Ok(())
}
