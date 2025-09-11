use yellowstone_grpc_proto::solana::storage::confirmed_block::TokenBalance;

#[derive(Debug)]
pub struct TransactionMetadata{
    pub pre_balances : Vec<u64>,
    pub post_balances : Vec<u64>,
    pub log_messages : Vec<String>,
    pub pre_token_balances : Vec<TokenBalance>,
    pub post_token_balances : Vec<TokenBalance>,
}

#[derive(Debug)]
pub struct TransactionLogs{
    pub transactionmetadata : TransactionMetadata,
    pub account_keys : Vec<String>
}