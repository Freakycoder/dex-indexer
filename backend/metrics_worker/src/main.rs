use shared::{workers::metrics_worker::MetricsWorker};
use dotenvy::dotenv;

#[tokio::main]
async fn main() {
    dotenv().ok();
    let metrics_worker = MetricsWorker::new().expect("Error in metrics worker initialization");
    metrics_worker.start_processing(std::env::var("METRICS_CONSUMER_GROUP").expect("unable to find consumer group from env"), std::env::var("METRICS_WORKER").expect("unable to find consume name from env")).await;
}
