use std::sync::Arc;

use shared::services::metrics_service::MetricsService;

#[tokio::main]
async fn main() {
    let metrics_service = Arc::new( MetricsService::new().expect("Error creating metrics service backgroud job"));
    println!("Starting the metrics service....");
    metrics_service.start_all_schedulers().await
}

