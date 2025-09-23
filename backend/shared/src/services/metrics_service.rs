use std::{collections::HashSet, sync::Arc, time::Duration};

use redis::{AsyncCommands, Client, RedisResult};
use tokio::time::interval;

use crate::redis::metric_and_ohlcv_manager::{MetricOHLCVManager, PeriodStats, TimeFrame};

#[derive(Debug)]
pub struct PeriodStatsUpdate{
    pub price_change_5m : Option<f64>,
    pub price_change_1h : Option<f64>,
    pub price_change_6h : Option<f64>,
    pub price_change_24h : Option<f64>,
    pub period_stats : Option<PeriodStats>
}

#[derive(Debug)]
pub struct MetricsService {
    pub metrics_manager: MetricOHLCVManager,
    pub redis_client: Client,
}

impl MetricsService {
    pub fn new() -> Result<Self, anyhow::Error> {
        let metrics_manager = MetricOHLCVManager::new()?;
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e| {
            println!("Couldn't initialize a redis client : {}", e);
            e
        })?;
        Ok(Self {
            metrics_manager,
            redis_client,
        })
    }

    pub async fn start_all_schedulers(self: Arc<Self>) {
        println!("🕐 Starting metrics schedulers...");

        let scheduler_5m = Arc::clone(&self);
        tokio::spawn(async move {
            scheduler_5m.start_5m_scheduler().await;
        });

        let scheduler_1h = Arc::clone(&self);
        tokio::spawn(async move {
            scheduler_1h.start_1h_scheduler().await;
        });

        let scheduler_6h = Arc::clone(&self);
        tokio::spawn(async move {
            scheduler_6h.start_6h_scheduler().await;
        });

        let scheduler_24h = Arc::clone(&self);
        tokio::spawn(async move {
            scheduler_24h.start_24h_scheduler().await;
        });

        println!(" All metrics schedulers started");
    }

    async fn start_5m_scheduler(&self) {
        let mut interval = interval(Duration::from_secs(300));
        loop {
            interval.tick().await;
            println!("⏰ Running 5-minute metrics update...");
            if let Ok(token_pair_list) = self.get_active_token_pairs().await {
                for token in token_pair_list {
                    let current_price  = self.metrics_manager.get_current_price(&token).await.expect("Error getting current price from redis");
                    if let Ok(token_metrics) = self.metrics_manager.get_metrics(&token).await{
                        match self.metrics_manager.get_historical_price(&token, TimeFrame::FiveMins).await{
                            Ok(Some(price)) => {
                                println!("got historical price for : {}", token);
                                let percentage_change = (current_price - price) / price;
                                let period_stats_update = PeriodStatsUpdate{
                                    price_change_5m : Some(percentage_change),
                                    price_change_1h : None,
                                    price_change_6h : None,
                                    price_change_24h : None,
                                    period_stats : Some(PeriodStats{
                                        txns : token_metrics.txns,
                                        volume : token_metrics.volume,
                                        makers : token_metrics.makers,
                                        buyers : token_metrics.buyers,
                                        buy_volume : token_metrics.buy_volume,
                                        buys : token_metrics.buys,
                                        sells : token_metrics.sells,
                                        sell_volume : token_metrics.sell_volume,
                                        sellers : token_metrics.sellers
                                    })
                                };
                                // send through pubsub
                            }
                            Ok(None) => {
                                println!("Recieved no historical price for : {}", token);
                            }
                            Err(e) => {
                                println!("Redis error occured while getting historical price : {}", e);
                            }
                        };
                    };
                }
            };
        }
    }
    async fn start_1h_scheduler(&self) {
        let mut interval = interval(Duration::from_secs(300));
        loop {
            interval.tick().await;
            println!("⏰ Running 5-minute metrics update...");
            if let Ok(token_pair_list) = self.get_active_token_pairs().await {
                for token in token_pair_list {
                    let current_price  = self.metrics_manager.get_current_price(&token).await.expect("Error getting current price from redis");
                    if let Ok(token_metrics) = self.metrics_manager.get_metrics(&token).await{
                        match self.metrics_manager.get_historical_price(&token, TimeFrame::OneHour).await{
                            Ok(Some(price)) => {
                                println!("got historical price for : {}", token);
                                let percentage_change = (current_price - price) / price;
                                let period_stats_update = PeriodStatsUpdate{
                                    price_change_5m : Some(percentage_change),
                                    price_change_1h : None,
                                    price_change_6h : None,
                                    price_change_24h : None,
                                    period_stats : Some(PeriodStats{
                                        txns : token_metrics.txns,
                                        volume : token_metrics.volume,
                                        makers : token_metrics.makers,
                                        buyers : token_metrics.buyers,
                                        buy_volume : token_metrics.buy_volume,
                                        buys : token_metrics.buys,
                                        sells : token_metrics.sells,
                                        sell_volume : token_metrics.sell_volume,
                                        sellers : token_metrics.sellers
                                    })
                                };
                                // send through pubsub
                            }
                            Ok(None) => {
                                println!("Recieved no historical price for : {}", token);
                            }
                            Err(e) => {
                                println!("Redis error occured while getting historical price : {}", e);
                            }
                        };
                    };
                }
            };
        }
    }
    async fn start_6h_scheduler(&self) {
        let mut interval = interval(Duration::from_secs(300));
        loop {
            interval.tick().await;
            println!("⏰ Running 5-minute metrics update...");
            if let Ok(token_pair_list) = self.get_active_token_pairs().await {
                for token in token_pair_list {
                    let current_price  = self.metrics_manager.get_current_price(&token).await.expect("Error getting current price from redis");
                    if let Ok(token_metrics) = self.metrics_manager.get_metrics(&token).await{
                        match self.metrics_manager.get_historical_price(&token, TimeFrame::SixHours).await{
                            Ok(Some(price)) => {
                                println!("got historical price for : {}", token);
                                let percentage_change = (current_price - price) / price;
                                let period_stats_update = PeriodStatsUpdate{
                                    price_change_5m : Some(percentage_change),
                                    price_change_1h : None,
                                    price_change_6h : None,
                                    price_change_24h : None,
                                    period_stats : Some(PeriodStats{
                                        txns : token_metrics.txns,
                                        volume : token_metrics.volume,
                                        makers : token_metrics.makers,
                                        buyers : token_metrics.buyers,
                                        buy_volume : token_metrics.buy_volume,
                                        buys : token_metrics.buys,
                                        sells : token_metrics.sells,
                                        sell_volume : token_metrics.sell_volume,
                                        sellers : token_metrics.sellers
                                    })
                                };
                                // send through pubsub
                            }
                            Ok(None) => {
                                println!("Recieved no historical price for : {}", token);
                            }
                            Err(e) => {
                                println!("Redis error occured while getting historical price : {}", e);
                            }
                        };
                    };
                }
            };
        }
    }
    async fn start_24h_scheduler(&self) {
        let mut interval = interval(Duration::from_secs(300));
        loop {
            interval.tick().await;
            println!("⏰ Running 5-minute metrics update...");
            if let Ok(token_pair_list) = self.get_active_token_pairs().await {
                for token in token_pair_list {
                    let current_price  = self.metrics_manager.get_current_price(&token).await.expect("Error getting current price from redis");
                    if let Ok(token_metrics) = self.metrics_manager.get_metrics(&token).await{
                        match self.metrics_manager.get_historical_price(&token, TimeFrame::TwentyFourHours).await{
                            Ok(Some(price)) => {
                                println!("got historical price for : {}", token);
                                let percentage_change = (current_price - price) / price;
                                let period_stats_update = PeriodStatsUpdate{
                                    price_change_5m : Some(percentage_change),
                                    price_change_1h : None,
                                    price_change_6h : None,
                                    price_change_24h : None,
                                    period_stats : Some(PeriodStats{
                                        txns : token_metrics.txns,
                                        volume : token_metrics.volume,
                                        makers : token_metrics.makers,
                                        buyers : token_metrics.buyers,
                                        buy_volume : token_metrics.buy_volume,
                                        buys : token_metrics.buys,
                                        sells : token_metrics.sells,
                                        sell_volume : token_metrics.sell_volume,
                                        sellers : token_metrics.sellers
                                    })
                                };
                                // send through pubsub
                            }
                            Ok(None) => {
                                println!("Recieved no historical price for : {}", token);
                            }
                            Err(e) => {
                                println!("Redis error occured while getting historical price : {}", e);
                            }
                        };
                    };
                }
            };
        }
    }

    async fn get_active_token_pairs(&self) -> RedisResult<Vec<String>> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let pattern = "token:*:current-price";
        let keys: Vec<String> = match conn.keys(pattern).await {
            Ok(keys) => keys,
            Err(e) => {
                println!("Error getting keys for active tokens from redis : {}", e);
                Vec::new()
            }
        };
        let mut token_pairs = HashSet::new();
        for key in keys {
            let parts: Vec<&str> = key.split(":").collect();
            let token_pair = parts[1].to_string();
            token_pairs.insert(token_pair);
        }
        Ok(token_pairs.into_iter().collect()) //.iter gives a iterator over references (&String) and .into_iter() gives iterator over owned values (String). then .collect consumes those iterator and creates a collection based on fn return type or type annotation.
    }
}
