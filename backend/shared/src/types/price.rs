use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenInfo {
    pub token_symbol: String,
    pub token_name: String,
}