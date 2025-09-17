use chrono::{DateTime, Utc, Duration};
use reqwest::Client;
use serde_json::Value;
use crate::redis::token_symbol_manager::TokenSymbolManager;

#[derive(Clone, Debug)]
struct SolPrice {
    pub sol_usd: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug)]
pub struct PriceService {
    token_manager : TokenSymbolManager
}

impl PriceService {
    pub fn new(token_manager : TokenSymbolManager) -> Self {
        Self {
            token_manager
        }
    }

    async fn get_cache_price(&self) -> Option<SolPrice> {
        if let Some(sol_info) = self.token_manager.get_sol_value().await{
           println!("Got SOL value from redis");
           

           Some(SolPrice { sol_usd: sol_info.sol_price, last_updated: sol_info.last_updated })
        } else {
            println!("Got no SOL value from redis");
          return None;  
        }
        
    }

    pub async fn get_sol_price(&self) -> Option<f64> {
        if let Some(cached_price) = self.get_cache_price().await {
            if Utc::now().signed_duration_since(cached_price.last_updated) < Duration::seconds(300) {
                return Some(cached_price.sol_usd);
            }
        }

        match self.fetch_price().await {
            Ok(sol_price) => Some(sol_price),
            Err(e) => {
                println!("Error fetching sol price: {}", e);
                self.get_cache_price().await.map(|cached| cached.sol_usd)
            }
        }
    }

    async fn fetch_price(&self) -> Result<f64, anyhow::Error> {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

        let client = Client::new();
        let response: Value = client
            .get(url)
            .send()
            .await?
            .json()
            .await?;

        let sol_price = response["solana"]["usd"]
            .as_f64()
            .ok_or_else(|| anyhow::anyhow!("Error parsing sol value from response"))?;

        self.token_manager.store_sol_value(sol_price).await?;
        println!("Successfully stored SOL price in redis");

        Ok(sol_price)
    }
}
