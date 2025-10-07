use shared::{queues::{swap_txn_manager::SwapTxnQueueManager}, workers::txn_worker::TxnWorker};
use dotenvy::dotenv;

#[tokio::main]
async fn main() {
    dotenv().ok();
    println!(" Starting txn worker...");

    let swap_queue = SwapTxnQueueManager::new().expect("Failed to create swap queue");
    let worker = TxnWorker::new(swap_queue);

    worker.start_processing().await;
}
