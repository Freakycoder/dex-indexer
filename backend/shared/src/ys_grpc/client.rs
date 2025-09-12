use std::collections::HashMap;
use futures::{StreamExt, SinkExt};// used for something that already implement the sink and stream trait. its like an interface for them, which provides them extra methods like .send().await or .next().await() or .map() or .filter() 
use yellowstone_grpc_client::{ClientTlsConfig, GeyserGrpcClient};
use yellowstone_grpc_proto::geyser::{SubscribeRequest, SubscribeRequestFilterTransactions};
use crate::redis::queue_manager::QueueManager;

const RADUIM_AMM_V4 : &str = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RADUIM_CLMM : &str = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";

#[derive(Debug, Clone)]
pub struct GrpcClient{
    grpc_url : String,
    token : String
}

impl GrpcClient {
    pub fn new(endpoint: String, token: String) -> Self {
        println!("Initializing grpc endpoint along with token access...");
        Self {
            grpc_url: endpoint,
            token: token,
        }
    }

    async fn client_connection(&self) -> Result<GeyserGrpcClient<impl yellowstone_grpc_client::Interceptor>, anyhow::Error>{
    println!("Connecting to yellowstone server...");

    let client = GeyserGrpcClient::build_from_shared(self.grpc_url.to_string())?
    .x_token(Some(self.token.to_string()))?
    .tls_config(ClientTlsConfig::new().with_native_roots())?
    .connect()
    .await?;

    println!("Connected to server");
    Ok(client)
}

fn create_subscription(&self) -> SubscribeRequest{
    let mut transactions = HashMap::new();
    transactions.insert("raduim_swap_transactions".to_string(), SubscribeRequestFilterTransactions{
        vote : Some(false),
        failed : Some(false),
        signature : None,
        account_include : vec![RADUIM_AMM_V4.to_string(), RADUIM_CLMM.to_string()],
        account_exclude : vec![
            "MEViEnscUm6tsQRoGd9h6nLQaQspKj7DB2M5FwM3Xvz".to_string(), // SolanaMevBot.com
            "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4".to_string(),  // Jupiter (used by many bots)
            "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY".to_string() // Phoenix DEX id
        ],
        account_required : vec![]
    });

    println!("created subscription for grpc stream");

    SubscribeRequest { accounts: HashMap::new(), slots: HashMap::new(), transactions, transactions_status: HashMap::new(), blocks: HashMap::new(), blocks_meta: HashMap::new(), entry: HashMap::new(), commitment: None, accounts_data_slice: vec![], ping: None, from_slot: None }
}
pub async fn start_listening(&self) -> Result<(), anyhow::Error>{
    let mut client = self.client_connection().await?;
    let subcription = self.create_subscription();
    let (mut sink, mut stream) = client.subscribe().await?; //stream is nothing but the data (multiple items) you get from a source asynchronously.

    sink.send(subcription).await?;
    let queue  = QueueManager::new().expect("error initializing queue");

    println!("Listening for transactions from grpc...");

    while let Some(update) = stream.next().await{
        match update {
            Ok(update_item) => {
               if let Some(item) = update_item.update_oneof{
                    match item {
                        yellowstone_grpc_proto::geyser::subscribe_update::UpdateOneof::Transaction(txn_item) => {
                            if let Some(txn) = txn_item.transaction{
                                if let Some(txn_meta) = txn.meta{
                                    let _ = queue.enqueue_message(txn_meta);
                                }
                                else {
                                    println!("Metadata doesn't exist")
                                }
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
}



