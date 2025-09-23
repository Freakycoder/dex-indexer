use std::collections::HashMap;

use chrono::{Utc};
use redis::{AsyncCommands, Client, RedisError, RedisResult};
use serde::{Deserialize, Serialize};
use crate::types::{worker::{StructeredTransaction, Type}};

#[derive(Debug,Serialize,Deserialize, Clone)]
pub struct PeriodStats{
    pub txns : u64,
    pub volume : f64,
    pub makers : usize,
    pub buys : u64,
    pub sells : u64,
    pub buy_volume : f64,
    pub sell_volume : f64,
    pub buyers : usize,
    pub sellers : usize
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum TimeFrame {
    FiveMins,
    OneHour,
    SixHours,
    TwentyFourHours
}

#[derive(Debug)]
pub struct MetricOHLCVManager {
    redis_client: Client,
}

impl MetricOHLCVManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("Initializing redis client...for METRIC OHLCV cache");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e| {
            println!("Couldn't initialize a redis client : {}", e);
            e
        })?;
        Ok(Self {
            redis_client: redis_client,
        })
    }

    pub async fn update_current_price(&self, token_pair: String, price_usd : f64) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let price_key = format!("token:{}:current-price" , token_pair);
        let _: () = conn.set(price_key, price_usd).await?;

        let history_key = format!("token:{}:history-price", price_usd);
        let history_price_entry = format!("{}:{}", Utc::now().timestamp(), price_usd);

        conn.lpush(&history_key, history_price_entry).await?;
        conn.ltrim(history_key, 0, 3000).await?;
        println!("updated current price and pushed to historical price for : {}", token_pair);
        Ok(())
    }

    pub async fn update_market_data(&self, token_pair: String, market_cap : i32, fdv : i32) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let mkc_key = format!("token:{}:market-cap" , token_pair);
        let fdv_key = format!("token:{}:fdv", token_pair);

        conn.set(mkc_key, market_cap).await?;
        conn.set(fdv_key, fdv).await?;
        println!("updated current market cap and fdv for : {}", token_pair);
        Ok(())
    }

    pub async fn update_period_stats(&self, txn : StructeredTransaction) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let stats_key = format!("token:{}:stats", txn.token_pair);
        let is_buy = matches!(txn.purchase_type, Type::Buy);
        let buyers_key = format!("token:{}:buyers", txn.token_pair);
        let sellers_key = format!("token:{}:makers", txn.token_pair);

        // calculate volume ( buy vol + sell vol), txns (buys + sells) and makers (buyers + sellers) from the following.
        if is_buy{
            conn.hincr(&stats_key, "buys", 1).await?;
            conn.hincr(&stats_key, "buy vol", txn.usd_value).await?;
            conn.sadd(&buyers_key, txn.owner).await?;

        }
        else {
            conn.hincr(&stats_key, "sells", 1).await?;
            conn.hincr(&stats_key, "sell vol", txn.usd_value).await?;
            conn.sadd(&sellers_key, txn.owner).await?;
        }
        conn.expire(stats_key, 86400).await?;
        conn.expire(buyers_key, 86400).await?;
        conn.expire(sellers_key, 86400).await?;
        println!("Updated period stats for token pair : {}", txn.token_pair);
        Ok(())
    }

    pub async fn get_historical_price(&self, token_pair: &str, timeframe : TimeFrame) -> RedisResult<Option<f64>>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let history_key = format!("token:{}:history-price", token_pair);
        let timerange = match timeframe {
            TimeFrame::FiveMins => {   
                5 * 60
            },
            TimeFrame::OneHour => {
                60 * 60
            },
            TimeFrame::SixHours => {
                6 * 60 * 60
            },
            TimeFrame::TwentyFourHours => {
                24 * 60 * 60
            }
        };
        let price_history : Vec<String> = conn.lrange(history_key, 0, -1).await?;
        let search_timeframe = Utc::now().timestamp() - timerange; // seconds 5 mins ago
        let mut timeframe_price : Option<f64> = None;
        let mut closest_diff = i64::MAX; // initially the value is max.

        for entry in price_history{
            let parts : Vec<&str> = entry.split(":").collect();
            let timestamp = parts[0].parse().unwrap_or(0); // the time in secs present in the price_history list
            let price = parts[1].parse().unwrap_or(0.0);

            if timestamp <= search_timeframe{
                let diff = search_timeframe - timestamp;
                if diff < closest_diff{
                    closest_diff = diff; // as timestamp gets closer to 5 mins ago the diff reduces.
                    timeframe_price = Some(price);
                }
            }
            break;
        };
        Ok(timeframe_price)
    }

    pub async fn get_current_price(&self, token_pair: &str) -> RedisResult<f64>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let current_price : f64 = conn.get(token_pair).await?; 
        Ok(current_price)
    }

    pub async fn get_metrics(&self, token_pair: &str) -> RedisResult<PeriodStats>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let stats_key = format!("token:{}:stats", token_pair);
        let token_stats : HashMap<String, String> = conn.hgetall(&stats_key).await?;
        
        let buys = token_stats.get("buys").unwrap_or(&"0".to_string()).parse().unwrap_or(0);
        let sells = token_stats.get("sells").unwrap_or(&"0".to_string()).parse().unwrap_or(0);
        let buy_volume = token_stats.get("buy vol").unwrap_or(&"0.0".to_string()).parse().unwrap_or(0.0);
        let sell_volume = token_stats.get("sell vol").unwrap_or(&"0.0".to_string()).parse().unwrap_or(0.0);
        let txns = buys + sells;
        let volume = buy_volume + sell_volume;
        let buyers_key = format!("token:{}:buyers", token_pair);
        let sellers_key = format!("token:{}:sellers", token_pair);
        let buyers_list : Vec<String> = conn.smembers(buyers_key).await?;
        let sellers_list : Vec<String> = conn.smembers(sellers_key).await?;
        let buyers = buyers_list.len();
        let sellers = sellers_list.len();
        let makers = buyers + sellers;
        Ok(PeriodStats{
            txns,
            volume,
            makers,
            buys,
            sells,
            buy_volume,
            sell_volume,
            buyers,
            sellers
        })
    }
}
