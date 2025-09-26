use std::time::Duration;
use tokio::time::sleep;
use crate::{queues::structured_txn_manager::StructeredTxnQueueManager, redis::{metric_and_ohlcv_manager::MetricOHLCVManager, pubsub_manager::PubSubManager, token_symbol_manager::TokenSymbolManager}};

#[derive(Debug)]
pub struct MetricsWorker{
    pub structured_txn_queue : StructeredTxnQueueManager,
    pub metric_manager : MetricOHLCVManager,
    pub pubsub_manager : PubSubManager,
    pub token_manager : TokenSymbolManager
}

impl MetricsWorker {
    pub fn new(structured_txn_queue : StructeredTxnQueueManager) -> Result<Self, anyhow::Error>{

        let metric_manager = MetricOHLCVManager::new()?;
        let pubsub_manager = PubSubManager::new().expect("Error creating pub sub manager");
        let token_manager = TokenSymbolManager::new().expect("Error creating token symbol manager in metrics worker");
        Ok(Self { structured_txn_queue, metric_manager, pubsub_manager, token_manager })
    }

    pub async fn start_processing(&self) {
        println!("Metrics Worker started and waiting for messages...");
        loop {
            match self.structured_txn_queue.dequeue_message().await {
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", txn_message);
                    let token_pair_clone = txn_message.token_pair.clone();
                    if let Err(e) = self.metric_manager.update_current_price(txn_message.token_pair.clone(), txn_message.token_price).await{
                        println!("Error occured while updating current price to redis : {}",e)
                    };
                    let sol_info = match self.token_manager.get_sol_value().await{
                        Some(price) => price,
                        None => {
                            println!("Got no value for SOL from redis");
                            continue;
                        }
                    };
                    if let Err(e) = self.pubsub_manager.publish_current_price(txn_message.token_price, sol_info.sol_price, txn_message.token_pair).await{
                        println!("Error occured while publishing current price : {}",e)
                    };
                    let market_cap = fastrand::i32(100_000..=1_000_000);
                    let fdv = fastrand::i32(100_000..=1_000_000);
                    if let Err(e) = self.metric_manager.update_market_data(token_pair_clone, market_cap, fdv).await{
                        println!("Error occured while updating token metrics to redis : {}",e)
                    };
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