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
pub enum TimeFrame{
    OneSecond,
    OneMinute,
    FiveMinutes,
    OneHour,
    FourHours,
    OneDay,
    OneWeek
}

impl TimeFrame {
    pub fn to_string(&self) -> String{
        match self{
            TimeFrame::OneSecond => "1s".to_string(),
            TimeFrame::OneMinute => "1s".to_string(),
            TimeFrame::FiveMinutes => "1s".to_string(),
            TimeFrame::OneHour => "1s".to_string(),
            TimeFrame::FourHours => "1s".to_string(),
            TimeFrame::OneDay => "1s".to_string(),
            TimeFrame::OneWeek => "1s".to_string(),
        }
    }

    pub fn to_seconds(&self) -> i64{
         match self{
            TimeFrame::OneSecond => 1,
            TimeFrame::OneMinute => 60,
            TimeFrame::FiveMinutes => 300,
            TimeFrame::OneHour => 3600,
            TimeFrame::FourHours => 14400,
            TimeFrame::OneDay => 86400,
            TimeFrame::OneWeek => 604800,
        }
    }
    pub fn all() -> Vec<TimeFrame>{
        vec![
            TimeFrame::OneSecond,
            TimeFrame::OneMinute,
            TimeFrame::FiveMinutes,
            TimeFrame::OneHour,
            TimeFrame::FourHours,
            TimeFrame::OneDay,
            TimeFrame::OneWeek
        ]
    }
    pub fn round_timestamp(&self, txn_timestamp : i64) -> i64{
        match self{
            TimeFrame::OneSecond => 1,
            TimeFrame::OneMinute => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            TimeFrame::FiveMinutes => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            TimeFrame::OneHour => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            TimeFrame::FourHours => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            TimeFrame::OneDay => {(txn_timestamp / self.to_seconds()) * self.to_seconds()},
            TimeFrame::OneWeek => {(txn_timestamp / self.to_seconds()) * self.to_seconds()}
        }
    }
}