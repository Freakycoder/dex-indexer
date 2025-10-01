use crate::queues::{
    structured_txn_manager::StructeredTxnQueueManager, swap_txn_manager::SwapTxnQueueManager,
};
use crate::services::price_service::PriceService;
use crate::{
    redis::{pubsub_manager::PubSubManager, token_symbol_manager::TokenSymbolManager},
    types::{
        grpc::{CustomTokenBalance, TransactionMetadata},
        worker::{StructeredTransaction, Type},
    },
};
use crate::{METEORA_DAMM_V1, METEORA_DAMM_V2, METEORA_DLMM, RADUIM_AMM_V4, RADUIM_CLMM};
use std::{collections::HashMap, time::Duration};
use tokio::time::sleep;

#[derive(Debug)]
struct SwapAnalysis {
    user_owner: String,
    user_token_change: f64,
    pool_sol_change: f64,
    token_name: String,
    token_symbol: String,
}

#[derive(Debug)]
pub struct TxnWorker {
    swap_queue: SwapTxnQueueManager,
    structured_txn_queue: StructeredTxnQueueManager,
    pubsub_manager: PubSubManager,
    price_service: PriceService,
}
const SOL_MINT: &str = "So11111111111111111111111111111111111111112";

impl TxnWorker {
    pub fn new(
        swap_queue: SwapTxnQueueManager,
        structured_txn_queue: StructeredTxnQueueManager,
    ) -> Self {
        let token_manager =
            TokenSymbolManager::new().expect("Error creating a token symbol manager");
        let pubsub_manager = PubSubManager::new().expect("Error creating pubsub manager");
        Self {
            swap_queue,
            structured_txn_queue,
            pubsub_manager,
            price_service: PriceService::new(token_manager),
        }
    }

    pub async fn start_processing(&self) {
        println!("Worker started and waiting for messages...");
        loop {
            match self.swap_queue.dequeue_message().await {
                Ok(Some(txn_message)) => {
                    println!("Got txn messsage from the queue");
                    println!("Txn Metadata : {:?}", txn_message);
                    self.filter_and_send_txns(txn_message).await;
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
    async fn filter_and_send_txns(&self, txn_meta: TransactionMetadata) {
        for message in &txn_meta.log_messages {
            if message.contains("SwapV2") || message.contains("SwapRaydiumV4") {
                println!("✅ Detected a Raydium swap");

                if let Some(structured_txn) = self.transform_swap(&txn_meta, "Raydium").await {
                    if let Err(e) = self
                        .pubsub_manager
                        .publish_transaction(structured_txn.clone())
                        .await
                    {
                        println!("Failed to publish transaction to redis channel: {}", e);
                    }

                    if let Err(e) = self
                        .structured_txn_queue
                        .enqueue_message(structured_txn)
                        .await
                    {
                        println!("Failed to enqueue structured transaction: {}", e);
                    }
                }
                break;
            } else if message.contains("Swap2") || message.contains("Swap") {
                println!("✅ Detected a Meteora Swap");
                if let Some(structured_txn) = self.transform_swap(&txn_meta, "Meteora").await {
                    if let Err(e) = self
                        .pubsub_manager
                        .publish_transaction(structured_txn.clone())
                        .await
                    {
                        println!("Failed to publish transaction to redis channel: {}", e);
                    }

                    if let Err(e) = self
                        .structured_txn_queue
                        .enqueue_message(structured_txn)
                        .await
                    {
                        println!("Failed to enqueue structured transaction: {}", e);
                    }
                }
                break;
            }
        }
    }

    async fn analyze_swap(
        &self,
        pre_balances: &[CustomTokenBalance],
        post_balances: &[CustomTokenBalance],
    ) -> Option<SwapAnalysis> {
        let mut owner_balances: HashMap<String, Vec<(String, f64, f64)>> = HashMap::new(); // owner -> [(mint, pre_amount, post_amount)]

        for (pre, post) in pre_balances.iter().zip(post_balances.iter()) {
            let pre_amount = pre.ui_token_amount.as_ref()?.ui_amount;
            let post_amount = post.ui_token_amount.as_ref()?.ui_amount;

            owner_balances
                .entry(pre.owner.clone())
                .or_insert(Vec::new())
                .push((pre.mint.clone(), pre_amount, post_amount));
        }

        let mut user_owner = String::new();
        let mut pool_owner = String::new();

        for (owner, balances) in &owner_balances {
            let has_sol = balances.iter().any(|(mint, _, _)| mint == SOL_MINT);
            let has_custom_token = balances.iter().any(|(mint, _, _)| mint != SOL_MINT);

            if has_sol && has_custom_token {
                pool_owner = owner.clone();
            } else {
                user_owner = owner.clone();
            }
        }

        if user_owner.is_empty() || pool_owner.is_empty() {
            println!("Either USER or POOL ACCOUNT missing");
            return None;
        }

        let mut token_name = String::new();
        let mut token_symbol = String::new();

        if let Some(user_info) = owner_balances.get(&user_owner) {
            for (token_mint, _, _) in user_info {
                if let Some(token_info) = self.price_service.get_mint_info(token_mint).await {
                    token_name = token_info.token_name;
                    token_symbol = token_info.token_symbol;
                }
            }
        }

        let user_balances = owner_balances.get(&user_owner)?;
        let pool_balances = owner_balances.get(&pool_owner)?;
        let mut pool_sol_change = 0.0;
        let mut user_token_change = 0.0;

        for (mint, pre_amount, post_amount) in user_balances {
            let change = post_amount - pre_amount;

            if mint == SOL_MINT {
                pool_sol_change = change;
            } else {
                user_token_change = change;
            }
        }

        for (mint, pre_amount, post_amount) in pool_balances {
            if mint == SOL_MINT {
                pool_sol_change = post_amount - pre_amount;
                break;
            }
        }

        Some(SwapAnalysis {
            user_owner,
            user_token_change,
            pool_sol_change,
            token_name,
            token_symbol,
        })
    }

    async fn transform_swap(
        &self,
        txn_meta: &TransactionMetadata,
        dex_type: &str,
    ) -> Option<StructeredTransaction> {
        let pre_balance_array = &txn_meta.pre_token_balances;
        let post_balance_array = &txn_meta.post_token_balances;

        if pre_balance_array.is_empty() || post_balance_array.is_empty() {
            println!(" Missing token balance data");
            return None;
        }

        let analysis = self
            .analyze_swap(pre_balance_array, post_balance_array)
            .await?;
        println!("Got swap analysis for the swap");

        let logs = &txn_meta.log_messages;
        let mut dex_tag = String::new();

        for log in logs {
            if log.contains(METEORA_DLMM) {
                dex_tag = "DLMM".to_string();
                break;
            } else if log.contains(METEORA_DAMM_V2) {
                dex_tag = "DYN2".to_string();
                break;
            } else if log.contains(METEORA_DAMM_V1) {
                dex_tag = "DYN".to_string();
                break;
            } else if log.contains(RADUIM_AMM_V4) {
                dex_tag = "CPMM".to_string();
                break;
            } else if log.contains(RADUIM_CLMM) {
                dex_tag = "CLMM".to_string();
                break;
            }
        }

        if dex_tag.is_empty() {
            dex_tag = match dex_type {
                "Raydium" => "CPMM".to_string(),
                "Meteora" => "DLMM".to_string(),
                _ => "UNKNOWN".to_string()
            };
        }

        let (purchase_type, token_amount_change, sol_amount_abs) = if analysis.pool_sol_change < 0.0
        {
            println!(
                "SELL : User Sold {} token, pool lost {} SOL",
                analysis.user_token_change.abs(),
                analysis.pool_sol_change.abs()
            );
            (
                Type::Sell,
                analysis.user_token_change.abs(),
                analysis.pool_sol_change.abs(),
            )
        } else if analysis.pool_sol_change > 0.0 {
            println!(
                "BUY : User Bought {} token, pool gained {} SOL",
                analysis.user_token_change.abs(),
                analysis.pool_sol_change.abs()
            );
            (
                Type::Buy,
                analysis.user_token_change.abs(),
                analysis.pool_sol_change.abs(),
            )
        } else {
            println!("No SOL change detected in pool");
            return None;
        };

        let token_pair = if !analysis.token_symbol.is_empty() {
            format!("{}/SOL", analysis.token_symbol)
        } else {
            format!("{}/SOL", "UNKNOWN")
        };

        let token_name = if !analysis.token_name.is_empty() {
            analysis.token_name
        } else {
            analysis.token_symbol.clone()
        };

        if let Some(sol_price) = self.price_service.get_sol_price().await {
            let usd_value = sol_amount_abs * sol_price;
            let token_price = if token_amount_change > 0.0 {
                usd_value / token_amount_change
            } else {
                0.0
            };

            Some(StructeredTransaction {
                date: chrono::Utc::now(),
                purchase_type,
                usd_value: Some(usd_value),
                token_quantity: token_amount_change,
                token_price,
                token_pair,
                token_name,
                owner: analysis.user_owner,
                dex_type: dex_type.to_string(),
                dex_tag: dex_tag.to_string(),
            })
        } else {
            Some(StructeredTransaction {
                date: chrono::Utc::now(),
                purchase_type,
                usd_value: None,
                token_quantity: token_amount_change,
                token_price: 0.0,
                token_pair,
                token_name,
                owner: analysis.user_owner,
                dex_type: dex_type.to_string(),
                dex_tag: dex_tag.to_string(),
            })
        }
    }
}
