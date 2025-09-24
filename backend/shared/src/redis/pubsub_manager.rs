use futures::StreamExt;
use redis::{AsyncCommands, Client, RedisResult, RedisError};
use tokio::sync::mpsc;
use crate::{services::metrics_service::PeriodStatsUpdate, types::worker::StructeredTransaction};

#[derive(Debug)]
pub enum PubSubMessage{
    Transaction(StructeredTransaction),
    PriceMetrics(PeriodStatsUpdate)
}

#[derive(Debug, Clone)]
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

    // the websocket calls this fn.
    pub async fn subscribe_to_channels(&self) -> RedisResult<mpsc::UnboundedReceiver<PubSubMessage>> {
        let (tx, rx) = mpsc::unbounded_channel(); // we create unbounded mpsc channel to send messages to it through redis subscription
        let client = self.redis_client.clone(); // created clone bcoz below code consumes the self (redis_client) 
        tokio::spawn(async move {
            if let Err(e) = Self::subscription_loop(client,tx).await { // an async task that starts at the side and pushes messages to mpsc
                println!("PubSub subscription error: {}", e);
            }
        });
        
        Ok(rx) // webscoket of recieve the rx to consume message from mpsc
    }

    async fn subscription_loop(client : Client, tx : mpsc::UnboundedSender<PubSubMessage>) -> RedisResult<()>{
        let mut pubsub = client.get_async_pubsub().await?;
        pubsub.subscribe("transactions").await?; // sunscribe to both channels
        pubsub.subscribe("price_metrics").await?;

        println!("Subs to redis channel");
        let mut pubsub_stream = pubsub.into_on_message();
        while let Some(msg) = pubsub_stream.next().await{ // iterate of the stream to get messages
            let channel = msg.get_channel_name();
            let payload: String = match msg.get_payload() {
                Ok(payload) => payload,
                Err(e) => {
                    println!("Failed to get payload from message: {}", e);
                    continue;
                }
            };
            match channel {
                "transactions" => {
                    match serde_json::from_str::<StructeredTransaction>(&payload) {
                        Ok(txn) => {
                            if let Err(_) = tx.send(PubSubMessage::Transaction(txn)){ // wrap the txn into an enum so it would be easy for websocket to identify the message                                println!("failed to send transaction to mpsc channel");
                                break;
                            }
                        },
                        Err(e) => {
                            println!("Failed to desearilze transaction : {}",e);
                        }
                    }
                }
                "price_metrics" => {
                    match serde_json::from_str::<PeriodStatsUpdate>(&payload) {
                        Ok(stats) => {
                            if let Err(_) = tx.send(PubSubMessage::PriceMetrics(stats)){
                                println!("Failed to send update stats to mpsc channel");
                                break;
                            }
                        }
                        Err(e) => {
                            println!("Failed to desearialize period stats : {}",e)
                        }
                    }
                }
                _ => {
                    println!("⚠️ Received message from unknown channel: {}", channel);
                }
            }
        };
        println!("pubsub subscription loop ended");
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