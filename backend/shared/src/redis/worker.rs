use std::{time::Duration};
use sea_orm::{prelude::DateTimeLocal, DatabaseConnection};
use tokio::sync::broadcast;
use tokio::time::sleep;
use crate::{redis::queue_manager::QueueManager, types::{grpc::TransactionMetadata, worker::{StructeredTransaction, Type}}, websocket::ws_manager::WebsocketManager, redis::price_service::PriceService};

#[derive(Debug)]
pub struct QueueWorker{
    queue : QueueManager,
    websocket : WebsocketManager,
    price_service : PriceService
}
const SOL_MINT: &str = "So11111111111111111111111111111111111111112";

impl QueueWorker {
    pub fn new(queue : QueueManager, websocket : WebsocketManager) -> Self{
        Self{
            queue,
            websocket,
            price_service : PriceService::new()
        }
    }

    pub async fn start_processing(&self){
        loop {
            match self.queue.dequeue_message().await{
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}",txn_message);
                    self.filter_and_send_txns(txn_message);
                }
                Ok(None) => {
                    println!("Queue empty, no message recieved");
                    sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    println!("Error in redis queue : {}", e);
                    sleep(Duration::from_millis(100));
                }
            }
        }
    }
    async fn filter_and_send_txns(&self, txn_meta: TransactionMetadata) {
        for message in &txn_meta.log_messages {
            if message.contains("SwapV2") || message.contains("SwapRaydiumV4") {
                println!("✅ Detected a Raydium swap");
                
                if let Some(structured_txn) = self.transform_swap(txn_meta.clone()) {
                    match serde_json::to_string(&structured_txn) {
                        Ok(txn_json) => {
                            self.websocket.push(txn_json).await;
                        }
                        Err(e) => {
                            println!("Error converting structured txn to string: {}", e);
                        }
                    }
                }
                break; // Found a swap, no need to check other messages
            }
        }
    }
    async fn transform_swap(&self, txn_meta: TransactionMetadata) -> Option<StructeredTransaction> {
        let pre_balance_array = &txn_meta.pre_token_balances;
        let post_balance_array = &txn_meta.post_token_balances;

        if pre_balance_array.is_empty() || post_balance_array.is_empty() {
            println!("⚠️ Missing token balance data");
            return None;
        }

        
        let pre_balance_json = serde_json::json!(pre_balance_array);
        let post_balance_json = serde_json::json!(post_balance_array);
        
        let pre_amount = pre_balance_json[0]["ui_token_amount"]["ui_amount"].as_f64()?;
        let post_amount = post_balance_json[0]["ui_token_amount"]["ui_amount"].as_f64()?;
        let owner = pre_balance_json[0]["owner"].as_str()?.to_string();
        let pre_sol_quantity = pre_balance_json[2]["ui_token_amount"]["ui_amount"].as_f64()?;
        let post_sol_quantity = post_balance_json[2]["ui_token_amount"]["ui_amount"].as_f64()?;
        
        if pre_balance_json[3]["mint"].as_str() = SOL_MINT{
            let sol_price = self.price_service.get_sol_price().await;

            if let Some(sol_value) = sol_price{
                
                let (purchase_type, amount_diff, sol_quantity) = if post_amount > pre_amount {
                    println!("BUY order transaction structured");
                    (Type::Buy, post_amount - pre_amount, post_sol_quantity - pre_sol_quantity)
                } else {
                    println!("SELL order transaction structured");
                    (Type::Sell, pre_amount - post_amount, pre_sol_quantity - post_sol_quantity)
                };
    
                let usd_price = sol_quantity * sol_value;
    
                let price_per_token = if amount_diff == 0.0 {
                    0.0
                } else {
                    usd_price / amount_diff
                };
        
                return Some(StructeredTransaction {
                    date: chrono::Utc::now(),
                    purchase_type,
                    usd: usd_price,
                    dex_type: "Raydium".to_string(),
                    token_quantity: amount_diff,
                    token_price: price_per_token, 
                    owner,
                });
            }
            Some(StructeredTransaction { 
                date: chrono::Utc::now(), 
                purchase_type: (), 
                usd: (), 
                token_quantity: (), 
                token_price: (), 
                owner: (), 
                dex_type: () 
            })
        }


    }
}
