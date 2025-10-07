use std::time::Duration;
use tokio::time::sleep;
use crate::{queues::{stream_manager::StreamManager}, redis::{metric_and_ohlcv_manager::MetricOHLCVManager, pubsub_manager::PubSubManager}, types::{ohlcv::{CandleTimeFrame, OHLCVcandle}, worker::{StructeredTransaction, Type}}};

#[derive(Debug)]
pub struct OHLCVWorker{
    pub ohlcv_manager : MetricOHLCVManager,
    pub pubsub_manager : PubSubManager,
    pub stream_manager : StreamManager
}

impl OHLCVWorker {
    pub fn new() -> Self{
        let ohlcv_manager = MetricOHLCVManager::new().expect("unable to access ohlcv manager");
        let pubsub_manager = PubSubManager::new().expect("Unable to create pubsub for ohlcv");
        let stream_manager = StreamManager::new().expect("unable to access stream from ohlcv worker");
        Self {ohlcv_manager, pubsub_manager, stream_manager }
    }

    pub async fn start_processing(&self,  consumer_group: String, consumer_name: String) {
        println!("Worker started and waiting for messages...");
        let _ = self.stream_manager.init_stream(&consumer_group).await;
        loop {
            match self.stream_manager.consume(&consumer_group, &consumer_name).await {
                Ok(Some(stream_data)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", stream_data.1);
                    if let Err(e) = self.transform_data(stream_data.1).await{
                        println!("Error tranforming the structured txn into ohlcv data : {}",e);
                    };
                    if let Err(e) = self.stream_manager.ack(&consumer_group, &stream_data.0).await{
                        println!("Error in acknowledment of message {} : {}", stream_data.0, e);
                    }
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
        
        for timeframe in CandleTimeFrame::all(){
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

    async fn build_or_update_candle(&self, txn : &StructeredTransaction, timeframe : CandleTimeFrame, candle_timestamp : i64) -> Result<OHLCVcandle, anyhow::Error>{
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
                        Type::Sell => candle.sell_volume += txn.token_quantity
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