use redis::{AsyncCommands, Client, RedisError, RedisResult};

use crate::types::{worker::StructeredTransaction};
#[derive(Debug)]
pub struct StructeredTxnQueueManager {
    redis_client: Client,
}

impl StructeredTxnQueueManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("Initializing redis client...for STRUCTURED QUEUE");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e| {
            println!("Couldn't initialize a redis client : {}", e);
            e
        })?;
        Ok(Self {
            redis_client: redis_client,
        })
    }

    pub async fn enqueue_message(
        &self,
        structured_txn: StructeredTransaction,
    ) -> RedisResult<usize> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let structured_txn_json = serde_json::to_string(&structured_txn).expect("Failed to serialize the structured txn");
        let queue_length: usize = conn.lpush("structered_transactions", structured_txn_json).await?;
        println!("txn pushed to structured queue");
        Ok(queue_length)
    }

    pub async fn dequeue_message(&self) -> RedisResult<Option<StructeredTransaction>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let txn_message: Option<String> = conn.rpop("structered_transactions", None).await?;
         match txn_message {
            Some(message) => match serde_json::from_str::<StructeredTransaction>(&message) {
                Ok(txn_json) => Ok(Some(txn_json)),
                Err(e) => {
                    println!("Failed to desearilize Structured txn message {}", e);
                    Ok(None)
                }
            },
            None => Ok(None),
        }
        
    }
}
