use dotenvy::dotenv;
use shared::ys_grpc::client::GrpcClient;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenv().ok();
    let grpc_client = GrpcClient::new(std::env::var("GRPC_URL").expect("no grpc url in env"), std::env::var("GRPC_TOKEN").expect("no token in env"));
    if let Err(e) = grpc_client.start_listening().await{
        eprint!("grpc listener error : {}",e);
    };
    Ok(())
}

