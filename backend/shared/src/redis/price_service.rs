use anyhow::Context;
use chrono::{DateTime, Utc, Duration};
use reqwest::Client;
use serde_json::Value;
use solana_program::{pubkey::Pubkey};
use mpl_token_metadata::{programs::MPL_TOKEN_METADATA_ID, accounts::Metadata};
use crate::{redis::token_symbol_manager::TokenSymbolManager, types::price::TokenInfo};
use std::str::FromStr;
use solana_client::rpc_client::RpcClient;

#[derive(Clone, Debug)]
struct SolPrice {
    pub sol_usd: f64,
    pub last_updated: DateTime<Utc>,
}

pub struct PriceService {
    token_manager : TokenSymbolManager,
    rpc_client : RpcClient
}

impl std::fmt::Debug for PriceService {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PriceService")
            .field("token_manager", &self.token_manager)
            .field("rpc_client", &"RpcClient")
            .finish()
    }
}

impl PriceService {
    pub fn new(token_manager : TokenSymbolManager) -> Self {
        Self {
            token_manager,
            rpc_client : RpcClient::new(std::env::var("HELIUS_URL").expect("Helius url not present in env"))
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

    pub async fn get_mint_info(&self, mint_address: &String) -> Option<TokenInfo>{
        let token_info  =  self.token_manager.get_mint_info(mint_address).await;
           
       match token_info {
            Some(info) => Some(info),
            None => {
                println!("Token not in cache, fetching from blockchain for mint: {}", mint_address);
                match self.parse_metadata_pda_data(mint_address.clone()).await {
                    Ok(Some(info)) => Some(info),
                    Ok(None) => {
                        println!("No metadata found on-chain for mint: {}", mint_address);
                        None
                    },
                    Err(e) => {
                        println!("Error fetching metadata for mint {}: {}", mint_address, e);
                        None
                    }
                }
            }
        }
    }

    pub fn get_metadata_pda_address(
        &self,
        mint_address: &str,
    ) -> Result<Pubkey, anyhow::Error> {
        let mint_pubkey = Pubkey::from_str(mint_address).context("Error occured while parsing pubkey")?;
        let mpl_program_id = Pubkey::new_from_array(MPL_TOKEN_METADATA_ID.to_bytes());
        let meta_seeds = &[
            b"metadata",
            MPL_TOKEN_METADATA_ID.as_ref(),
            mint_pubkey.as_ref(),
        ];
        let (metadata_pda, _) = Pubkey::find_program_address(meta_seeds, &mpl_program_id);
        Ok(metadata_pda)
    }

     fn get_metadata_pda_data(
        &self,
        mint_address: String,
    ) -> Result<Option<Vec<u8>>, anyhow::Error> {
        let metadata_pda = self.get_metadata_pda_address(&mint_address)?;

        match self.rpc_client.get_account(&metadata_pda) {
            Ok(account) => {
                println!("Metadata account found");
                println!("Data length {} bytes", account.data.len());

                let mpl_program_id = Pubkey::new_from_array(MPL_TOKEN_METADATA_ID.to_bytes());
                if account.owner == mpl_program_id {
                    Ok(Some(account.data)) // we're returning vector of bytes
                } else {
                    println!("But account not owned by metaplex program");
                    Ok(None)
                }
            }
            Err(rpc_error) => {
                println!("❌ RPC Error fetching metadata account: {:?}", rpc_error);
                Ok(None)
            }
        }
    }

    pub async fn parse_metadata_pda_data(
        &self,
        mint_address: String
    ) -> Result<Option<TokenInfo>, anyhow::Error> {
        let metadata_account_data = match self.get_metadata_pda_data(mint_address.clone()) {
            Ok(Some(data_byte)) => data_byte, // the return type is result of option, so we check for both some and none
            Ok(None) => return Ok(None),
            Err(e) => return Err(e),
        };
        println!("📋 Parsing metadata account...");

        match Metadata::safe_deserialize(&metadata_account_data) {
            Ok(metadeta) => {
                self.token_manager.create_mint_info(mint_address, metadeta.symbol.clone(), metadeta.name.clone()).await.expect("Error saving mint info to redis cache");
                return Ok(Some(TokenInfo { token_symbol: metadeta.symbol, token_name: metadeta.name }));
                }
            Err(_) => {
                println!("no metadata found for the mint : {}", mint_address);
                Ok(None)}
        }                
    }
}
