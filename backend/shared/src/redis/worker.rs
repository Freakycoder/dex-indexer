use std::{thread::sleep, time::Duration};
use sea_orm::DatabaseConnection;
use crate::{redis::queue_manager::QueueManager, types::grpc::TransactionMetadata};

#[derive(Debug)]
pub struct QueueWorker{
    queue : QueueManager,
    db : DatabaseConnection
}

impl QueueWorker {
    pub fn new(queue : QueueManager, db : DatabaseConnection) -> Self{
        Self{
            queue,
            db
        }
    }

    pub async fn start_processing(&self){
        loop {
            match self.queue.dequeue_message().await{
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}",txn_message);
                    self.filter_txns(txn_message);
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
    fn filter_txns(&self, txn_meta : TransactionMetadata){
        for messages in txn_meta.log_messages{
            if messages.contains("SwapV2") || messages.contains("SwapRaydiumV4"){
                println!("✅ Detected a Radium swap");

            }
        }
    }
    fn transform_swap(&self, txn_meta : TransactionMetadata){
        let pre_balance = txn_meta.pre_token_balances;
        let post_balance = txn_meta.post_token_balances;
        
    }
}