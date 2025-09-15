use std::{collections::HashMap, sync::Arc, time::{Duration, Instant}};

use reqwest::{header::SEC_WEBSOCKET_ACCEPT, Client};
use sea_orm_cli::cli;
use tokio::sync::RwLock;

struct SolPrice{
    pub sol_usd : f64,
    pub last_updated : Instant
}

#[derive(Debug)]
struct PriceService{
    cache : Arc<RwLock<HashMap<String , SolPrice>>>
}

impl PriceService {
    pub fn new() -> Self{
        Self { cache: Arc::new(RwLock::new(HashMap::new())) }
    }

    async fn get_cache_price(&self) -> Option<SolPrice>{
        let cache = self.cache.read().await;
        cache.get("sol_price")
    }

    async fn get_sol_price(&self) -> Option<f64>{
        if let Some(cached_price) = self.get_cache_price().await{
            if cached_price.last_updated.elapsed() < Duration::from_secs(300){
                return Some(cached_price.sol_usd);
            }
        }

        match self.fetch_price_from_jupyter().await {
            Ok(sol_price) => {
                sol_price
            },
            Err(e) => {
                println!("Error fetching sol price from jupyter : {}",e);
                Some(self.get_cache_price())
            }
        }

    }

    async fn fetch_price_from_jupyter(&self) -> Result<f64, anyhow::Error>{
        let url = format!("https://price.jup.ag/v4/price?id=SOL");

        let client = Client::new();
        let response = client
            .get(url)
            .timeout(Duration::from_secs(15))
            .send()
            .await?
            .json()
            .await?;

        let write_cache = self.cache.write().await;
        write_cache.insert("sol_price", response);
        Ok(response.sol_usd)
    }
}