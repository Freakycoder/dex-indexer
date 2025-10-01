use sea_orm::prelude::DateTimeUtc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize,Deserialize, Clone)]
pub struct StructeredTransaction {
    pub date: DateTimeUtc,
    pub purchase_type: Type,
    pub usd_value: Option<f64>,
    pub token_quantity: f64,
    pub token_price: f64,
    pub token_pair : String,
    pub token_name : String,
    pub owner: String,
    pub dex_type: String,
    pub dex_tag : String
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum Type {
    Buy,
    Sell,
}
