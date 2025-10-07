use shared::{workers::metrics_worker::MetricsWorker};
use dotenvy::dotenv;

#[tokio::main]
async fn main() {
    dotenv().ok();
    let metrics_worker = MetricsWorker::new().expect("Error in metrics worker initialization");
    metrics_worker.start_processing(std::env::var("CONSUMER_GROUP_METRIC").expect("unable to find consumer group from env"), std::env::var("METRIC_WORKER").expect("unable to find consume name from env")).await;
}
