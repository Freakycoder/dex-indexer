use dotenvy::dotenv;
// use sea_orm::Database;
use shared::{
    queues::structured_txn_manager::StructeredTxnQueueManager,
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
    let structured_txn_queue = StructeredTxnQueueManager::new().expect("❌ Failed to create transaction queue manager");
    let ohlcv_worker  = OHLCVWorker::new(structured_txn_queue);
    ohlcv_worker.start_processing().await;

    Ok(())
}