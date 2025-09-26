use shared::{queues::structured_txn_manager::StructeredTxnQueueManager, workers::metrics_worker::MetricsWorker};

#[tokio::main]
async fn main() {
    let txn_queue_manager = StructeredTxnQueueManager::new().expect("Error in txn queue manager in metrics worker");
    let metrics_worker = MetricsWorker::new(txn_queue_manager).expect("Error in metrics worker initialization");
    metrics_worker.start_processing().await;
}
