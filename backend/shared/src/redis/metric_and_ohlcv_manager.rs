use redis::{AsyncCommands, Client, RedisError};
use serde::{Deserialize, Serialize};
use crate::types::price::TokenInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct MetricInfo {
    pub token_pair : String,
    pub usd_price: f64,
    pub sol_relative_price: f64,
    pub liquidity : f64,
    pub fdv : f64,
    pub mkt_cap : f64,
    pub periodic_stats : PeriodStats
}

#[derive(Debug,Serialize,Deserialize)]
pub struct PeriodStats{
    pub timeframe : String,
    pub txns : u64,
    pub volume : f64,
    pub makers : u64,
    pub buys : u64,
    pub sells : u64,
    pub buy_volume : f64,
    pub sell_volume : f64,
    pub buyers : u64,
    pub seller : u64
}


#[derive(Debug)]
pub struct MetricOHLCVManager {
    redis_client: Client,
}

impl MetricOHLCVManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("Initializing redis client...for OHLCV cache");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e| {
            println!("Couldn't initialize a redis client : {}", e);
            e
        })?;
        Ok(Self {
            redis_client: redis_client,
        })
    }

    pub async fn create_metric_info(
        &self,
        metric_info : MetricInfo
    ) -> Result<String, anyhow::Error> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
       
        let token_info_string = serde_json::to_string(&metric_info)?;
        let _: () = conn.set(metric_info.token_pair.clone(), token_info_string).await?;
        println!("created new metric info for the pair: {}",metric_info.token_pair );
        Ok(metric_info.token_pair)
    }

    

    pub async fn get_metric_info(&self, token_pair: String) -> Option<TokenInfo> {
        let mut conn = match self.redis_client.get_multiplexed_async_connection().await {
            Ok(conn) => conn,
            Err(_) => {
                println!("Error connecting to redis server");
                return None;
            }
        };
        let metric_info_string: Option<String> = match conn.get(token_pair.clone()).await {
            Ok(info) => info,
            Err(e) => {
                println!("Error getting metric info for the pair {} : {}", token_pair,e);
                return None;
            }
        };

        if let Some(metric_string) = metric_info_string {
            println!("Found mint info in the redis server");
            let mint_info: TokenInfo = match serde_json::from_str(&metric_string) {
                Ok(data) => data,
                Err(_) => {
                    println!("Error getting session data from the server");
                    return None;
                }
            };
            Some(mint_info)
        } else {
            println!("Did not find any mint info in the redis server");
            None
        }
    }

    
}
