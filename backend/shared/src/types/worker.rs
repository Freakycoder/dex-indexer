use sea_orm::prelude::DateTimeUtc;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct StructeredTransaction {
    pub date: DateTimeUtc,
    pub purchase_type: Type,
    pub usd: Option<f64>,
    pub token_quantity: f64,
    pub token_price: f64,
    pub owner: String,
    pub dex_type: String,
}

#[derive(Debug, Serialize)]
pub enum Type {
    Buy,
    Sell,
}
