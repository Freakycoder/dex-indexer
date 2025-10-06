use std::time::Duration;
use tokio::time::sleep;
use crate::{queues::structured_txn_manager::StructeredTxnQueueManager, redis::{metric_and_ohlcv_manager::MetricOHLCVManager, pubsub_manager::PubSubManager}, types::{ohlcv::{OHLCVcandle, TimeFrame}, worker::{StructeredTransaction, Type}}};

#[derive(Debug)]
pub struct OHLCVWorker{
    pub structured_txn_queue : StructeredTxnQueueManager,
    pub ohlcv_manager : MetricOHLCVManager,
    pub pubsub_manager : PubSubManager
}

impl OHLCVWorker {
    pub fn new(structured_txn_queue : StructeredTxnQueueManager) -> Self{
        let ohlcv_manager = MetricOHLCVManager::new().expect("unable to access ohlcv manager");
        let pubsub_manager = PubSubManager::new().expect("Unable to create pubsub for ohlcv");
        Self { structured_txn_queue, ohlcv_manager, pubsub_manager }
    }

    pub async fn start_processing(&self) {
        println!("Worker started and waiting for messages...");
        loop {
            match self.structured_txn_queue.dequeue_message().await {
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", txn_message);
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

    pub async fn transform_data(&self, txn : StructeredTransaction) -> Result<(), anyhow::Error>{
        let txn_timestamp = txn.date.timestamp();
        
        for timeframe in TimeFrame::all(){
            let timeframe_str = timeframe.to_string();
            let candle_timestamp = timeframe.round_timestamp(txn_timestamp);
            println!(" {} : {} rounded to {}", timeframe_str, txn_timestamp, candle_timestamp);
            let candle = self.build_or_update_candle(&txn, timeframe, candle_timestamp).await?;

            if let Err(e) = self.ohlcv_manager.save_candle(&candle).await{
                println!("Error saving candle to redis : {}",e)
            };

            if let Err(e) =  self.pubsub_manager.publish_candle_update(candle).await{
                println!("Error pushing candle update through pubsub : {}", e)
            }
        }
        println!("Processed transaction for all timeframes for token : {}", txn.token_pair);
        Ok(())
    }

    async fn build_or_update_candle(&self, txn : &StructeredTransaction, timeframe : TimeFrame, candle_timestamp : i64) -> Result<OHLCVcandle, anyhow::Error>{
        let timeframe_str = timeframe.to_string();

       let existing_candle = self.ohlcv_manager.get_candle(&txn.token_pair, &timeframe_str, candle_timestamp).await?;

            let candle = match existing_candle {
                Some(mut candle) => {
                    candle.high = candle.high.max(txn.token_price);
                    candle.low = candle.low.min(txn.token_price);
                    candle.close = txn.token_price;
                    candle.volume += txn.token_quantity;
                    candle.trade_count += 1;

                    match txn.purchase_type {
                        Type::Buy => candle.buy_volume += txn.token_quantity,
                        Type::Sell => candle.buy_volume += txn.token_quantity
                    }
                    println!("updated old candle for pair : {}", txn.token_pair);
                    candle
                }
                None => {
                    println!("created new candle for pair : {}", txn.token_pair);
                    OHLCVcandle{
                        token_pair : txn.token_pair.clone(),
                        timeframe : timeframe_str,
                        timestamp : candle_timestamp,
                        open : txn.token_price,
                        high : txn.token_price,
                        low : txn.token_price,
                        close : txn.token_price,
                        volume : txn.token_quantity,
                        buy_volume : if matches!(txn.purchase_type, Type::Buy){
                            txn.token_quantity
                        } else {
                            0.0
                        },
                        sell_volume : if matches!(txn.purchase_type, Type::Sell){
                            txn.token_quantity
                        } else{
                            0.0
                        },
                        trade_count : 1
                    }
                }
            };
            Ok(candle)
    }

    
}