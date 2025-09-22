use std::time::Duration;
use tokio::time::sleep;
use crate::{queues::structured_txn_manager::StructeredTxnQueueManager, redis::metric_and_ohlcv_manager::MetricOHLCVManager};

#[derive(Debug)]
pub struct MetricsWorker{
    pub structured_txn_queue : StructeredTxnQueueManager,
    pub metric_manager : MetricOHLCVManager
}

impl MetricsWorker {
    pub fn new(structured_txn_queue : StructeredTxnQueueManager) -> Result<Self, anyhow::Error>{

        let metric_manager = MetricOHLCVManager::new()?;
        Ok(Self { structured_txn_queue, metric_manager })
    }

    pub async fn start_processing(&self) {
        println!("Worker started and waiting for messages...");
        loop {
            match self.structured_txn_queue.dequeue_message().await {
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", txn_message);
                    let token_pair_clone = txn_message.token_pair.clone();
                    self.metric_manager.update_current_price(txn_message.token_pair, txn_message.token_price).await;
                    let market_cap = fastrand::i32(100_000..=1_000_000);
                    let fdv = fastrand::i32(100_000..=1_000_000);
                    self.metric_manager.update_market_data(token_pair_clone, market_cap, fdv).await;
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