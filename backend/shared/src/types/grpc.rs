use serde::{Serialize, Deserialize};
use yellowstone_grpc_proto::solana::storage::confirmed_block::{TokenBalance, UiTokenAmount};

#[derive(Debug, Serialize, Deserialize)]
pub struct TransactionMetadata {
    pub log_messages: Vec<String>,
    pub pre_token_balances: Vec<CustomTokenBalance>,
    pub post_token_balances: Vec<CustomTokenBalance>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomTokenBalance {
    pub account_index: u32,
    pub mint: String,
    pub ui_token_amount: Option<CustomUiTokenAmount>,
    pub owner: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomUiTokenAmount {
    pub ui_amount: f64,
    pub decimals: u32,
    pub amount: String,
    pub ui_amount_string: String,
}

// what we did here and why not name and serialize conflict

impl From<&TokenBalance> for CustomTokenBalance {
    fn from(token_balance: &TokenBalance) -> Self {
        Self {
            account_index: token_balance.account_index,
            mint: token_balance.mint.clone(),
            owner: token_balance.owner.clone(),
            ui_token_amount: token_balance.ui_token_amount.as_ref().map(CustomUiTokenAmount::from),
        }
    }
}

impl From<&UiTokenAmount> for CustomUiTokenAmount {
    fn from(ui_amount: &UiTokenAmount) -> Self {
        Self {
            ui_amount: ui_amount.ui_amount,
            decimals: ui_amount.decimals,
            amount: ui_amount.amount.clone(),
            ui_amount_string: ui_amount.ui_amount_string.clone(),
        }
    }
}