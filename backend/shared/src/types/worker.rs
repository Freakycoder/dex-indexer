use sea_orm::prelude::DateTimeLocal;

#[derive(Debug)]
pub struct StructeredTransaction{
    pub date : DateTimeLocal,
    pub purchase_type : Type,
    pub usd : f64,
    pub token : f64,
    pub price : f64,
    pub owner : String,
    pub dex_type : String,
} 

#[derive(Debug)]
pub enum Type{
    Buy,
    Sell
}