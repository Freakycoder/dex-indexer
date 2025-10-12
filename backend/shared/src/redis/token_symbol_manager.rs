use chrono::{DateTime,Utc};
use redis::{AsyncCommands, Client, RedisError};
use serde::{Deserialize, Serialize};
use crate::types::price::TokenInfo;

#[derive(Debug, Serialize, Deserialize)]
pub struct SolInfo {
    pub sol_price: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug)]
pub struct TokenSymbolManager {
    redis_client: Client,
}

impl TokenSymbolManager {
    pub fn new() -> Result<Self, RedisError> {
        println!("Initializing redis client...for TOKEN MANAGER cache");
        let redis_client = Client::open(std::env::var("REDIS_URL").expect("unable to fetch redis url from env")).map_err(|e| {
            println!("Couldn't initialize a redis client : {}", e);
            e
        })?;
        Ok(Self {
            redis_client: redis_client,
        })
    }

    pub async fn create_mint_info(
        &self,
        mint_address: String,
        token_symbol: String,
        token_name: String,
    ) -> Result<String, anyhow::Error> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let token_info = TokenInfo {
            token_name,
            token_symbol,
        };
        let token_info_string = serde_json::to_string(&token_info)?;
        let _: () = conn.set(mint_address.clone(), token_info_string).await?;
        println!("created new mint info");
        Ok(mint_address)
    }

    pub async fn store_sol_value(&self, sol_price: f64) -> Result<(), anyhow::Error> {
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let sol_info = SolInfo{
            sol_price,
            last_updated : Utc::now()
        };
        let price_string = serde_json::to_string(&sol_info)?;
        let _: () = conn.set("sol_price", price_string).await?;
        println!("updated SOL price");
        Ok(())
    }

    pub async fn get_mint_info(&self, mint_address: &String) -> Option<TokenInfo> {
        let mut conn = match self.redis_client.get_multiplexed_async_connection().await {
            Ok(conn) => conn,
            Err(_) => {
                println!("Error connecting to redis server");
                return None;
            }
        };
        let mint_info_string: Option<String> = match conn.get(mint_address).await {
            Ok(info) => info,
            Err(e) => {
                println!("Error getting mint info from the redis server : {}", e);
                return None;
            }
        };

        if let Some(mint_string) = mint_info_string {
            println!("Found mint info in the redis server");
            let mint_info: TokenInfo = match serde_json::from_str(&mint_string) {
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

    pub async fn get_sol_value(&self) -> Option<SolInfo>{
        let mut conn = match self.redis_client.get_multiplexed_async_connection().await {
            Ok(conn) => conn,
            Err(_) => {
                println!("Error connecting to redis server ");
                return None;
            }
        };
        let sol_price_string: Option<String> = match conn.get("sol_price").await {
            Ok(info) => info,
            Err(e) => {
                println!("Error getting SOL price from the redis server : {}", e);
                return None;
            }
        };

        if let Some(sol_info_string) = sol_price_string {
            println!("Found SOL price in the redis server");
            let sol_info : SolInfo  = match serde_json::from_str(&sol_info_string) {
                Ok(data) => data,
                Err(_) => {
                    println!("Error getting session data from the server");
                    return None;
                }
            };
            Some(sol_info)
        } else {
            println!("Did not find SOL price in the redis server");
            None
        }
    }
}
