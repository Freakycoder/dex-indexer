use futures::StreamExt;
use redis::{AsyncCommands, Client, RedisResult, RedisError};
use tokio::sync::mpsc;
use crate::{services::metrics_service::PeriodStatsUpdate, types::{ohlcv::OHLCVcandle, worker::StructeredTransaction}};
use serde::{Deserialize,Serialize};

#[derive(Debug)]
pub enum PubSubMessage{
    Transaction(StructeredTransaction),
    PriceMetrics(PeriodStatsUpdate),
    CurrentPrice(PriceInfo),
    CandleUpdate(OHLCVcandle)
}

#[derive(Debug,Serialize,Deserialize)]
pub struct PriceInfo{
    pub usd_current_price : f64,
    pub sol_relative_price : f64
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

    pub async fn publish_current_price(
        &self,
        price: f64,
        sol_price : f64,
        token_pair : String
    ) -> RedisResult<()> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        
         let price_info = PriceInfo{
            usd_current_price : price,
            sol_relative_price : price / sol_price
        };
        let message_json = serde_json::to_string(&price_info)
            .map_err(|e| {
                println!("Error serializing the current price message");
                e
            })?;
    
        conn.publish("current_price", message_json).await?;
        
        println!("📤 Published current price for {}", token_pair);
        Ok(())
    }

    pub async fn publish_candle_update(&self, candle : OHLCVcandle) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let candle_json = serde_json::to_string(&candle)
            .map_err(|e| {
                println!("Error serializing the candle data");
                e
            })?;
        conn.publish("candle_price", candle_json).await?;
        println!("Published candle update for token : {}", candle.token_pair);
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
        pubsub.subscribe("transactions").await?; // subscribe to both channels
        pubsub.subscribe("price_metrics").await?;
        pubsub.subscribe("current_price").await?;
        pubsub.subscribe("candle_price").await?;

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
                "current_price" => {
                    match serde_json::from_str::<PriceInfo>(&payload) {
                        Ok(price_info) => {
                            if let Err(_) = tx.send(PubSubMessage::CurrentPrice(price_info)){
                                println!("Failed to send current price to mpsc channel");
                                break;
                            }
                        }
                        Err(e) => {
                            println!("Failed to desearialize current price : {}",e)
                        }
                    }
                },
                "candle_price" => {
                    match serde_json::from_str::<OHLCVcandle>(&payload) {
                        Ok(candle_info) => {
                            if let Err(_) = tx.send(PubSubMessage::CandleUpdate(candle_info)){
                                println!("Failed to send candle data to mpsc channel");
                                break;
                            }
                        }
                        Err(e) => {
                            println!("Failed to desearialize candle data : {}",e)
                        }
                    }
                },
                _ => {
                    println!("⚠️ Received message from unknown channel: {}", channel);
                }
            }
        };
        println!("pubsub subscription loop ended");
        Ok(())
    }
}