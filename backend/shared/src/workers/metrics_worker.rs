use crate::{
    queues::{stream_manager::StreamManager},
    redis::{
        metric_and_ohlcv_manager::MetricOHLCVManager, pubsub_manager::PubSubManager,
        token_symbol_manager::TokenSymbolManager,
    },
    types::worker::StructeredTransaction,
};
use std::time::Duration;
use redis::{RedisResult};
use tokio::time::sleep;

#[derive(Debug)]
pub struct MetricsWorker {
    pub metric_manager: MetricOHLCVManager,
    pub pubsub_manager: PubSubManager,
    pub token_manager: TokenSymbolManager,
    pub stream_manager: StreamManager,
}

impl MetricsWorker {
    pub fn new() -> Result<Self, anyhow::Error> {
        let metric_manager = MetricOHLCVManager::new()?;
        let pubsub_manager = PubSubManager::new().expect("Error creating pub sub manager");
        let token_manager = TokenSymbolManager::new()
            .expect("Error creating token symbol manager in metrics worker");
        let stream_manager =
            StreamManager::new().expect("unable to initialize stream in metric worker");
        Ok(Self {
            metric_manager,
            pubsub_manager,
            token_manager,
            stream_manager,
        })
    }

    pub async fn start_processing(&self, consumer_group: String, consumer_name: String) {
        println!("Metrics Worker started and waiting for messages...");
        let _ = self.stream_manager.init_stream(&consumer_group).await;
        loop {
            match self.stream_manager.consume(&consumer_group, &consumer_name).await {
                Ok(Some(stream_data)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", stream_data.1);
                    if let Err(e) = self.process_transaction(stream_data.1).await{
                        println!("Error occured while process the txn recieved from stream : {}",e)
                    };
                    if let Err(e) = self.stream_manager.ack(&consumer_group, &stream_data.0).await{
                        println!("Error in acknowledment of message {} : {}", stream_data.0, e);
                    }
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

    async fn process_transaction(&self, txn_message: StructeredTransaction) -> RedisResult<()> {
        let txn_clone = txn_message.clone();
        let token_pair_clone = txn_message.token_pair.clone();
        if let Err(e) = self
            .metric_manager
            .update_current_price(txn_message.token_pair.clone(), txn_message.token_price)
            .await
        {
            println!(
                "Error occured while updating current price to redis : {}",
                e
            )
        };

        if let Err(e) = self.metric_manager.update_period_stats(txn_clone).await {
            println!("Error occured updating period stats : {}", e);
        };
        let sol_info = match self.token_manager.get_sol_value().await {
            Some(price) => price,
            None => {
                println!("Got no value for SOL from redis");
                return Ok(());
            }
        };
        if let Err(e) = self
            .pubsub_manager
            .publish_current_price(
                txn_message.token_price,
                sol_info.sol_price,
                txn_message.token_pair,
            )
            .await
        {
            println!("Error occured while publishing current price : {}", e)
        };
        let market_cap = fastrand::i32(100_000..=1_000_000);
        let fdv = fastrand::i32(100_000..=1_000_000);
        if let Err(e) = self
            .metric_manager
            .update_market_data(token_pair_clone, market_cap, fdv)
            .await
        {
            println!(
                "Error occured while updating token metrics to redis : {}",
                e
            )
        };
        Ok(())
    }
}
