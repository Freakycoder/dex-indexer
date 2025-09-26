use std::{sync::Arc, time::Duration};

use shared::services::metrics_service::MetricsService;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    let metrics_service = Arc::new( MetricsService::new().expect("Error creating metrics service backgroud job"));
    println!("Starting the metrics service....");
    metrics_service.start_all_schedulers().await;
    
    // Keep the main thread alive indefinitely
    loop {
        sleep(Duration::from_secs(3600)).await;
    }
}

