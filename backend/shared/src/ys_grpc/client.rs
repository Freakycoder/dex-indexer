use crate::{queues::swap_txn_manager::SwapTxnQueueManager, METEORA_DAMM_V1, METEORA_DAMM_V2, METEORA_DLMM, RADUIM_AMM_V4, RADUIM_CLMM, ORCA_CLMM};
use futures::{SinkExt, StreamExt}; // used for something that already implement the sink and stream trait. its like an interface for them, which provides them extra methods like .send().await or .next().await() or .map() or .filter()
use std::collections::HashMap;
use yellowstone_grpc_client::{ClientTlsConfig, GeyserGrpcClient};
use yellowstone_grpc_proto::geyser::{SubscribeRequest, SubscribeRequestFilterTransactions};

#[derive(Debug, Clone)]
pub struct GrpcClient {
    grpc_url: String,
    token: String,
}

impl GrpcClient {
    pub fn new(endpoint: String, token: String) -> Self {
        println!("Initializing grpc endpoint along with token access...");
        Self {
            grpc_url: endpoint,
            token: token,
        }
    }

    async fn client_connection(
        &self,
    ) -> Result<GeyserGrpcClient<impl yellowstone_grpc_client::Interceptor>, anyhow::Error> {
        println!("Connecting to yellowstone server...");

        let client = GeyserGrpcClient::build_from_shared(self.grpc_url.to_string())?
            .x_token(Some(self.token.to_string()))?
            .tls_config(ClientTlsConfig::new().with_native_roots())?
            .connect()
            .await?;

        println!("Connected to server");
        Ok(client)
    }

    fn create_subscription(&self) -> SubscribeRequest {
        let mut transactions = HashMap::new();
        transactions.insert(
            "raduim_swap_transactions".to_string(),
            SubscribeRequestFilterTransactions {
                vote: Some(false),
                failed: Some(false),
                signature: None,
                account_include: vec![RADUIM_AMM_V4.to_string(), RADUIM_CLMM.to_string(), METEORA_DLMM.to_string(), METEORA_DAMM_V2.to_string(), METEORA_DAMM_V1.to_string(), ORCA_CLMM.to_string() ],
                account_exclude: vec![
                    "MEViEnscUm6tsQRoGd9h6nLQaQspKj7DB2M5FwM3Xvz".to_string(), // SolanaMevBot.com
                    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4".to_string(), // Jupiter (used by many bots)
                    "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY".to_string(), // Phoenix DEX id
                ],
                account_required: vec![],
            },
        );

        println!("created subscription for grpc stream");

        SubscribeRequest {
            accounts: HashMap::new(),
            slots: HashMap::new(),
            transactions,
            transactions_status: HashMap::new(),
            blocks: HashMap::new(),
            blocks_meta: HashMap::new(),
            entry: HashMap::new(),
            commitment: None,
            accounts_data_slice: vec![],
            ping: None,
            from_slot: None,
        }
    }
    pub async fn start_listening(&self) -> Result<(), anyhow::Error> {
        let mut client = self.client_connection().await?;
        let subcription = self.create_subscription();
        let (mut sink, mut stream) = client.subscribe().await?; //stream is nothing but the data (multiple items) you get from a source asynchronously.

        sink.send(subcription).await?;
        let queue = SwapTxnQueueManager::new().expect("error initializing queue");

        println!("Listening for transactions from grpc...");

        while let Some(update) = stream.next().await {
            match update {
                Ok(update_item) => {
                    if let Some(item) = update_item.update_oneof {
                        match item {
                        yellowstone_grpc_proto::geyser::subscribe_update::UpdateOneof::Transaction(txn_item) => {
                            if let Some(txn) = txn_item.transaction{
                                if let Some(txn_meta) = txn.meta{
                                    match queue.enqueue_message(txn_meta).await{
                                        Ok(_) => {
                                            print!("Metadata pushed to queue")
                                        }
                                        Err(e) => {
                                            println!("Redis error occured while pushing: {}",e)
                                        }
                                    };
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
                    println!("Stream error : {}", e);
                    break;
                }
            }
        }
        Ok(())
    }
}
