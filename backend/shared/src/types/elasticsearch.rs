use serde::{Serialize};

#[derive(Debug, Serialize)]
pub struct SearchResult{
    pub token_pair : String,
    pub score : f64
}

#[derive(Debug, Serialize)]
pub struct SearchResponse{
    pub results : Vec<SearchResult>
}