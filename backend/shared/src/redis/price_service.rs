use std::{collections::HashMap, sync::Arc, time::{Duration, Instant}};

use reqwest::Client;
use serde_json::Value;
use tokio::sync::RwLock;

#[derive(Clone)]
struct SolPrice{
    pub sol_usd : f64,
    pub last_updated : Instant
}

#[derive(Debug)]
pub struct PriceService{
    cache : Arc<RwLock<HashMap<String , SolPrice>>>
}

impl PriceService {
    pub fn new() -> Self{
        Self { cache: Arc::new(RwLock::new(HashMap::new())) }
    }

    async fn get_cache_price(&self) -> Option<SolPrice>{
        let cache = self.cache.read().await;
        cache.get("sol_price".to_string()).cloned()
    }

    pub async fn get_sol_price(&self) -> Option<f64>{
        if let Some(cached_price) = self.get_cache_price().await{
            if cached_price.last_updated.elapsed() < Duration::from_secs(300){
                return Some(cached_price.sol_usd);
            }
        }

        match self.fetch_price().await {
            Ok(sol_price) => {
                Some(sol_price)
            },
            Err(e) => {
                println!("Error fetching sol price: {}", e);
                self.get_cache_price().await.map(|cached| cached.sol_usd)
            }
        }

    }

    async fn fetch_price(&self) -> Result<f64, anyhow::Error>{
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

        let client = Client::new();
        let response: Value = client
            .get(url)
            .timeout(Duration::from_secs(15))
            .send()
            .await?
            .json()
            .await?;

        let sol_price = response["solana"]["usd"]
            .as_f64()
            .ok_or_else(|| anyhow::anyhow!("Error parsing sol value from response"))?;

        let mut cache = self.cache.write().await;
        cache.insert("sol_price".to_string(), SolPrice {
            sol_usd: sol_price,
            last_updated: Instant::now(),
        });

        Ok(sol_price)
    }
}