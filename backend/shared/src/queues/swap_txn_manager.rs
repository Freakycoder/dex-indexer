use redis::{AsyncCommands, Client, RedisError, RedisResult};

use crate::types::grpc::{CustomTokenBalance, TransactionMetadata};
#[derive(Debug)]
pub struct SwapTxnQueueManager {
    redis_client: Client,
}

impl SwapTxnQueueManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("Initializing redis client...for QUEUE");
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
        txn_meta: yellowstone_grpc_proto::solana::storage::confirmed_block::TransactionStatusMeta,
    ) -> RedisResult<usize> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        println!("------METADATA------");
        println!("Pre Balances : {:?}", txn_meta.pre_balances);
        println!("Post Balances : {:?}", txn_meta.post_balances);
        println!("Log Messages : {:?}", txn_meta.log_messages);
        println!("Pre Token Balances : {:?}", txn_meta.pre_token_balances);
        println!("Post Token Balances : {:?}", txn_meta.post_token_balances);

        let metadata = self.get_metadata(txn_meta);
        let txn_json = serde_json::to_string(&metadata).expect("Error serializing the txn meta");

        let queue_length: usize = conn.lpush("swap_transactions", txn_json).await?;
        println!("txn pushed to the swap queue");
        Ok(queue_length)
    }

    pub async fn dequeue_message(&self) -> RedisResult<Option<TransactionMetadata>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let txn_message: Option<String> = conn.rpop("swap_transactions", None).await?;

        match txn_message {
            Some(message) => match serde_json::from_str::<TransactionMetadata>(&message) {
                Ok(txn_json) => Ok(Some(txn_json)),
                Err(e) => {
                    println!("Failed to desearilize txn message {}", e);
                    Ok(None)
                }
            },
            None => Ok(None),
        }
    }

    fn get_metadata(
        &self,
        txn_meta: yellowstone_grpc_proto::solana::storage::confirmed_block::TransactionStatusMeta,
    ) -> TransactionMetadata {
        let custom_pre_token_balances = txn_meta
            .pre_token_balances
            .iter()
            .map(CustomTokenBalance::from)
            .collect();
        let custom_post_token_balances = txn_meta
            .post_token_balances
            .iter()
            .map(CustomTokenBalance::from)
            .collect();
        TransactionMetadata {
            log_messages: txn_meta.log_messages,
            pre_token_balances: custom_pre_token_balances,
            post_token_balances: custom_post_token_balances,
        }
    }
}
