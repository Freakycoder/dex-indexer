use shared::{queues::{structured_txn_manager::StructeredTxnQueueManager, swap_txn_manager::SwapTxnQueueManager}, workers::txn_worker::TxnWorker};
use dotenvy::dotenv;

#[tokio::main]
async fn main() {
    dotenv().ok();
    println!(" Starting txn worker...");

    let swap_queue = SwapTxnQueueManager::new().expect("Failed to create swap queue");
    let structured_txn_queue = StructeredTxnQueueManager::new().expect("Failed to create structured txn queue");
    let worker = TxnWorker::new(swap_queue, structured_txn_queue);

    worker.start_processing().await;
}
