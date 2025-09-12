use std::{thread::sleep, time::Duration};
use sea_orm::{prelude::DateTimeLocal, DatabaseConnection};
use tokio::sync::broadcast;
use crate::{redis::queue_manager::QueueManager, types::{grpc::TransactionMetadata, worker::{StructeredTransaction, Type}}, websocket::ws_manager::WebsocketManager};

#[derive(Debug)]
pub struct QueueWorker{
    queue : QueueManager,
    db : DatabaseConnection,
    websocket : WebsocketManager
}

impl QueueWorker {
    pub fn new(queue : QueueManager, db : DatabaseConnection, websocket : WebsocketManager) -> Self{
        Self{
            queue,
            db,
            websocket
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
    fn filter_and_send_txns(&self, txn_meta : TransactionMetadata){
        for messages in txn_meta.log_messages{
            if messages.contains("SwapV2") || messages.contains("SwapRaydiumV4"){
                println!("✅ Detected a Radium swap");
                let structured_txn = self.transform_swap(txn_meta);
                let string_txn = match serde_json::to_string(&structured_txn) {
                        Ok(msg) => {
                            msg
                        }
                        Err(e) => {
                            println!("Error converting the structured txn to string")
                        }
                };
                self.websocket.send_message(string_txn);
            }
        }
    }
    fn transform_swap(&self, txn_meta : TransactionMetadata) -> StructeredTransaction{
        let pre_balance_array = txn_meta.pre_token_balances;
        let post_balance_array = txn_meta.post_token_balances;

        let pre_balance_array_json = serde_json::json!(pre_balance_array);
        let pre_amount = pre_balance_array_json[0]["ui_token_amount"]["ui_amount"].as_f64()?;

        let post_balance_array_json = serde_json::json!(post_balance_array);
        let post_amount = post_balance_array_json[0]["ui_token_amount"]["ui_amount"].as_f64()?;

        if post_amount > pre_amount {
            let diff  = post_amount - pre_amount;

            println!("BUY order transaction structured");
            StructeredTransaction {
                date : Time,
                purchase_type : Type::Buy,
                usd : 6.5,
                dex_type : "Radium",
                token_quantity : None,
                token_price : None,
                owner : pre_balance_array_json[0]["owner"].as_str()
            }
        }
        else {
            let diff = pre_amount - post_amount;
            println!("SELL order transaction structured");

            StructeredTransaction {
                date : Time,
                purchase_type : Type::Sell,
                usd : 6.5,
                dex_type : "Radium",
                token_quantity : None,
                token_price : None,
                owner : pre_balance_array_json[0]["owner"].as_str()
            }
        }
    }
}