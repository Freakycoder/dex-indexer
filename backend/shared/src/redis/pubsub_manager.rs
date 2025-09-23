use redis::{AsyncCommands, Client, RedisResult, RedisError};
use crate::{services::metrics_service::PeriodStatsUpdate, types::worker::StructeredTransaction};


#[derive(Debug)]
pub struct PubSubManager {
    redis_client: Client,
}

impl PubSubManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("🔔 Initializing PubSub Manager...");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url)?;
        Ok(Self { redis_client })
    }

    pub async fn publish_transaction(
        &self,
        transaction: StructeredTransaction,
    ) -> RedisResult<()> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        
        
        let message_json = serde_json::to_string(&transaction)
            .map_err(|e| {
                println!("Error serializing the transaction message");
                e
            })?;
    
        conn.publish("transactions", message_json).await?;
        
        println!("📤 Published transaction for {}", transaction.token_pair);
        Ok(())
    }

    pub async fn publish_price_and_metrics_update(
        &self,
        updated_data : PeriodStatsUpdate
    ) -> RedisResult<()> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        
        let message_json = serde_json::to_string(&updated_data)
            .map_err(|e| {
                println!("Error serializing the transaction message");
                e
            })?;
        
        conn.publish("price_metrics", message_json).await?;
        
        println!("📤 Published price and metrics update for {}", updated_data.token_pair);
        Ok(())
    }


    // /// Publish OHLCV update
    // pub async fn publish_ohlcv_update(
    //     &self,
    //     token_pair: String,
    //     timeframe: String,
    //     ohlcv_data: serde_json::Value,
    // ) -> RedisResult<()> {
    //     let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        
    //     let message = PubSubMessage::OHLCVUpdate {
    //         token_pair: token_pair.clone(),
    //         timeframe: timeframe.clone(),
    //         data: ohlcv_data,
    //     };
        
    //     let message_json = serde_json::to_string(&message)
    //         .map_err(|e| RedisError::from((redis::ErrorKind::TypeError, "JSON serialization failed", e.to_string())))?;
        
    //     conn.publish("ohlcv", message_json).await?;
        
    //     println!("📤 Published OHLCV {} update for {}", timeframe, token_pair);
    //     Ok(())
    // }

}