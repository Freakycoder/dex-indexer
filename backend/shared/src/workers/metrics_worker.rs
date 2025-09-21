use std::time::Duration;

use tokio::time::sleep;

use crate::queues::structured_txn_manager::StructeredTxnQueueManager;

#[derive(Debug)]
pub struct MetricsWorker{
    pub structured_txn_queue : StructeredTxnQueueManager
}

impl MetricsWorker {
    pub fn new(structured_txn_queue : StructeredTxnQueueManager) -> Self{
        Self { structured_txn_queue }
    }

    pub async fn start_processing(&self) {
        println!("Worker started and waiting for messages...");
        loop {
            match self.structured_txn_queue.dequeue_message().await {
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", txn_message);
                }
                Ok(None) => {
                    println!("Queue empty, no message recieved");
                    sleep(Duration::from_millis(100)).await;
                }
                Err(e) => {
                    println!("Error in redis queue : {}", e);
                    sleep(Duration::from_millis(100)).await;
                }
            }
        }
    }
}