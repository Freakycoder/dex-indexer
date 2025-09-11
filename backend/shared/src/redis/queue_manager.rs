use redis::{Client, RedisError};

use crate::types::grpc::{CustomTokenBalance, TransactionMetadata};
#[derive(Debug)]
pub struct QueueManager{
    redis_client : Client
}

impl QueueManager {
    pub fn new() -> Result<Self, RedisError>{
        println!("Initializing redis queue...");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e|{
            println!("Couldn't initialize a redis client : {}",e);
            e
        })?;
        Ok(Self { redis_client: redis_client })
    }

    pub fn enqueue_message(&self,txn_meta : yellowstone_grpc_proto::solana::storage::confirmed_block::TransactionStatusMeta ){
        println!("------METADATA------");
        println!("Pre Balances : {:?}", txn_meta.pre_balances);
        println!("Post Balances : {:?}", txn_meta.post_balances);
        println!("Log Messages : {:?}", txn_meta.log_messages);
        println!("Pre Token Balances : {:?}", txn_meta.pre_token_balances);
        println!("Post Token Balances : {:?}", txn_meta.post_token_balances);

        
        let txn_json = match serde_json::to_string(&txn_meta){
            Ok(json) => {json},
            Err(e) => {
                println!("Failed to serialize transaction metadata: {}", e);
                return;
            }
        };
    }

    fn get_metadata(&self, txn_meta : yellowstone_grpc_proto::solana::storage::confirmed_block::TransactionStatusMeta) -> TransactionMetadata{
                
        let pre_token_balances = txn_meta.pre_token_balances;

        let custome_pre_token_balances : Vec<CustomTokenBalance> = pre_token_balances.iter().map(|item|{
            
            CustomTokenBalance { account_index: item.account_index, mint: item.mint, ui_token_amount: Some(item.ui_token_amount), owner: item.owner}
        }).collect();
        TransactionMetadata { log_messages: txn_meta.log_messages, pre_token_balances: custome_pre_token_balances, post_token_balances: txn_meta.post_token_balances}

    }

}
