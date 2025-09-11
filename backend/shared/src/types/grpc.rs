use serde::Serialize;


#[derive(Debug,Serialize)]
pub struct TransactionMetadata{
    pub log_messages : Vec<String>,
    pub pre_token_balances : Vec<CustomTokenBalance>,
    pub post_token_balances : Vec<CustomTokenBalance>,
}

#[derive(Debug,Serialize)]
pub struct CustomTokenBalance{
    pub account_index: u32,
    pub mint: String,
    pub ui_token_amount: Option<CustomUiTokenAmount>,
    pub owner: String
}

#[derive(Debug,Serialize)]
pub struct CustomUiTokenAmount {
    pub ui_amount: f64,
    pub decimals: u32,
    pub amount: String,
}