use dotenvy::dotenv;
// use sea_orm::Database;
use shared::{
    workers::ohlcv_worker::OHLCVWorker,
};

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenv().ok();
    
    println!("╔════════════════════════════════════════════════════╗");
    println!("║          🕯️  OHLCV WORKER STARTING                  ║");
    println!("╚════════════════════════════════════════════════════╝");

    // // Get database URL from environment
    // let database_url = std::env::var("DATABASE_URL")
    //     .expect("❌ DATABASE_URL must be set in .env file");

    // // Connect to database
    // println!("📦 Connecting to PostgreSQL...");
    // let db = Database::connect(&database_url).await?;
    // println!("✅ Database connected!");
    // println!();

    // Initialize queue manager
    let ohlcv_worker  = OHLCVWorker::new();
    ohlcv_worker.start_processing(std::env::var("OHLCV_CONSUMER_GROUP").expect("unable to find consumer group from env"), std::env::var("OHLCV_WORKER").expect("unable to find consume name from env")).await;

    Ok(())
}