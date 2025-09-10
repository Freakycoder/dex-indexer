use std::collections::HashMap;
use yellowstone_grpc_client::{ClientTlsConfig, GeyserGrpcClient};
use yellowstone_grpc_proto::geyser::{SubscribeRequest, SubscribeRequestFilterTransactions};
use futures::{SinkExt,StreamExt}; // used for something that already implement the sink and stream trait. its like an interface for them, which provides them extra methods like .send().await or .next().await() or .map() or .filter() 
use dotenvy::dotenv;

const RADUIM_AMM_V4 : &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RADUIM_CLMM : &str = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenv().ok();
    start_listening(std::env::var("GRPC_URL").expect("grpc not found in env"), std::env::var("GRPC_TOKEN").expect("token for grpc not found in env")).await?;
    Ok(())
}

async fn client_connection(rpc_endpoint : String, token : String) -> Result<GeyserGrpcClient<impl yellowstone_grpc_client::Interceptor>, anyhow::Error>{
    println!("Connecting to yellowstone server...");

    let client = GeyserGrpcClient::build_from_shared(rpc_endpoint)?
    .x_token(Some(token))?
    .tls_config(ClientTlsConfig::new().with_native_roots())?
    .connect()
    .await?;

    println!("Connected to server");
    Ok(client)
}

fn create_subscription() -> SubscribeRequest{
    let mut transactions = HashMap::new();
    transactions.insert("raduim_swap_transactions".to_string(), SubscribeRequestFilterTransactions{
        vote : Some(false),
        failed : Some(false),
        signature : None,
        account_include : vec![RADUIM_AMM_V4.to_string(), RADUIM_CLMM.to_string()],
        account_exclude : vec![],
        account_required : vec![]
    });

    println!("created subscription for grpc stream");

    SubscribeRequest { accounts: HashMap::new(), slots: HashMap::new(), transactions, transactions_status: HashMap::new(), blocks: HashMap::new(), blocks_meta: HashMap::new(), entry: HashMap::new(), commitment: None, accounts_data_slice: vec![], ping: None, from_slot: None }
}

async fn start_listening(rpc_endpoint : String, token : String) -> Result<(), anyhow::Error>{
    let mut client = client_connection(rpc_endpoint, token).await?;
    let subcription = create_subscription();
    let (mut sink, mut stream) = client.subscribe().await?; //stream is nothing but the data (multiple items) you get from a source asynchronously.

    sink.send(subcription).await?;

    println!("Listening for transactions from grpc...");

    while let Some(update) = stream.next().await{
        match update {
            Ok(update_item) => {
               if let Some(item) = update_item.update_oneof{
                    match item {
                        yellowstone_grpc_proto::geyser::subscribe_update::UpdateOneof::Transaction(txn_item) => {
                            if let Some(txn) = txn_item.transaction{
                                println!("trasaction : {:?}", txn.transaction);
                            }
                        }
                        _ => {println!("recieved non-transaction item")}
                    }
               }
            }
            Err(e) => {
                println!("Stream error : {}",e);
                break;
            }
        }
    };
    Ok(())
    
}