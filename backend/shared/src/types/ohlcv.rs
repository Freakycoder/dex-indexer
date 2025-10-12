use serde::{Deserialize, Serialize};

#[derive(Debug,Serialize, Deserialize)]
pub struct OHLCVcandle{
    pub token_pair : String,
    pub timeframe : String,
    pub timestamp : i64,
    pub open : f64,
    pub high : f64,
    pub low : f64,
    pub close : f64,
    pub volume : f64,
    pub buy_volume : f64,
    pub sell_volume : f64,
    pub trade_count : u32
}

#[derive(Debug)]
pub enum CandleTimeFrame{
    OneSecond,
    OneMinute,
    FiveMinutes,
    FifteenMinutes,
    OneHour,
    FourHours,
    OneDay,
    OneWeek
}

impl CandleTimeFrame {
    pub fn to_string(&self) -> String{
        match self{
            CandleTimeFrame::OneSecond => "1s".to_string(),
            CandleTimeFrame::OneMinute => "1m".to_string(),
            CandleTimeFrame::FiveMinutes => "5m".to_string(),
            CandleTimeFrame::FifteenMinutes => "15m".to_string(),
            CandleTimeFrame::OneHour => "1h".to_string(),
            CandleTimeFrame::FourHours => "4h".to_string(),
            CandleTimeFrame::OneDay => "1d".to_string(),
            CandleTimeFrame::OneWeek => "1w".to_string(),
        }
    }

    pub fn to_seconds(&self) -> i64{
         match self{
            CandleTimeFrame::OneSecond => 1,
            CandleTimeFrame::OneMinute => 60,
            CandleTimeFrame::FiveMinutes => 300,
            CandleTimeFrame::FifteenMinutes => 900,
            CandleTimeFrame::OneHour => 3600,
            CandleTimeFrame::FourHours => 14400,
            CandleTimeFrame::OneDay => 86400,
            CandleTimeFrame::OneWeek => 604800,
        }
    }
    pub fn all() -> Vec<CandleTimeFrame>{
        vec![
            CandleTimeFrame::OneSecond,
            CandleTimeFrame::OneMinute,
            CandleTimeFrame::FiveMinutes,
            CandleTimeFrame::FifteenMinutes,
            CandleTimeFrame::OneHour,
            CandleTimeFrame::FourHours,
            CandleTimeFrame::OneDay,
            CandleTimeFrame::OneWeek
        ]
    }
    pub fn round_timestamp(&self, txn_timestamp : i64) -> i64{
        match self{
            CandleTimeFrame::OneSecond => 1,
            CandleTimeFrame::OneMinute => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::FiveMinutes => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::FifteenMinutes => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::OneHour => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::FourHours => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::OneDay => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            CandleTimeFrame::OneWeek => {(txn_timestamp / self.to_seconds()) * self.to_seconds()}
        }
    }
}