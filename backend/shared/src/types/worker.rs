use sea_orm::prelude::DateTimeLocal;

#[derive(Debug)]
pub struct StructeredTransaction{
    pub date : Time,
    pub purchase_type : Type,
    pub usd : Option<f64>,
    pub token_quantity : f64,
    pub token_price : f64,
    pub owner : String,
    pub dex_type : String,
} 

#[derive(Debug)]
pub enum Type{
    Buy,
    Sell
}