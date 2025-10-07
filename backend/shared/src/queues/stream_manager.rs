use redis::{Client, RedisResult, Value};

use crate::types::worker::StructeredTransaction;

#[derive(Debug)]
pub struct StreamManager{
    pub redis_client : Client,
    pub stream_name : String
}

impl StreamManager {
    pub fn new() -> RedisResult<Self> {
        println!("Initializing Redis Stream Manager...");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e| {
            println!("Couldn't initialize redis client: {}", e);
            e
        })?;
        
        Ok(Self {
            redis_client,
            stream_name: "structured_txn_stream".to_string(),
        })
    }

    pub async fn publish(&self, txn : StructeredTransaction) -> RedisResult<String>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
        let txn_json = serde_json::to_string(&txn).map_err(|e| {
            println!("unable to serialize txn for redis stream");
            e
        })?;

        let id : String = redis::cmd("XADD")
                .arg(&self.stream_name)
                .arg("*")
                .arg("data")
                .arg(txn_json)
                .query_async(&mut conn)
                .await?;
        println!("published to stream with ID : {}", id);
        Ok(id)
    }
    pub async fn consume(&self, consumer_group : &String, consumer_name : &String) -> RedisResult<Option<(String, StructeredTransaction)>>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;
    
        let result :Vec<Value> = redis::cmd("XREADGROUP")
                .arg("GROUP")
                .arg(consumer_group)
                .arg(consumer_name)
                .arg("COUNT")
                .arg(1)
                .arg("BLOCK")
                .arg(1000)
                .arg("STREAMS")
                .arg(&self.stream_name)
                .arg(">")
                .query_async(&mut conn)
                .await?;

        if let Some(stream_data) = self.parse_stream_response(result){
            return Ok(Some(stream_data))
        }
        Ok(None)
        
    }

    pub async fn init_stream(&self, consumer_group : &String) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;

        let res : RedisResult<()> = redis::cmd("XGROUP")
                .arg("CREATE")
                .arg(&self.stream_name)
                .arg(&consumer_group)
                .arg("0")
                .arg("MKSTREAM")
                .query_async(&mut conn)
                .await;

        println!("Succesfully created group : {}", consumer_group);

        if let Err(e) = res{
            if e.to_string().contains("BUSYGROUP"){
                println!("Group already exist...continue")
            }
        }
        Ok(())
    }

    fn parse_stream_response(&self, result : Vec<Value>) -> Option<(String, StructeredTransaction)>{
        if result.is_empty(){
            return None;
        }

        if let Value::Array(streams) = &result[0]{
            if streams.len() < 2 {
                return None;
            }

            if let Value::Array(messages) = &streams[1]{
                if messages.is_empty(){
                    return None;
                }

                if let Value::Array(msg) = &messages[0]{
                    if msg.is_empty(){
                        return None;
                    }

                    let message_id = match &msg[0]{
                        Value::BulkString(id) => String::from_utf8_lossy(id).to_string(),
                        Value::SimpleString(id) => id.to_owned(),
                        _ => {
                            println!("Unexpected message id type : {:?}", msg[0]);
                            return None;
                        }
                    };

                    if let Value::Array(fields) = &msg[1]{
                        for i in (0..fields.len()).step_by(2){
                            let field_name = match &fields[i]{
                                Value::BulkString(name) => name.as_slice(), // converts vec<bytes> (vec<u8>) to slice of bytes [u8]
                                Value::SimpleString(name) => name.as_bytes(), // converts the string to [u8]
                                _ => {
                                    println!("unable to identify field name type : {:?}", fields[i]);
                                    return None;
                                }
                            };
                            // the i + 1 < field.len check is for safety purpose, to ensure while reading data we dont go out of bonds
                            if field_name == b"data" && i + 1 < fields.len(){ // b before data stands for bytes. it means give the byte representation on text 'data'
                                let json_str = match &fields[i+1]{
                                    Value::BulkString(json) => String::from_utf8_lossy(&json).to_string(),
                                    Value::SimpleString(json) => json.to_string(),
                                    _ => {
                                        println!("unexpected json message type received : {:?}", fields[i+1]);
                                        return None
                                    }
                                };

                                match serde_json::from_str::<StructeredTransaction>(&json_str){
                                    Ok(txn) => {
                                        println!("parsed succesfully txn from stream");    
                                        Some((&message_id, txn));
                                    },
                                    Err(e) => {
                                        println!("unable to deserialize the txn from stream : {}",e);
                                        return None;
                                    }
                                }

                            }

                        }
                    }
                }
            }
        }
        println!("Could not parse stream structure from response");
        return None
    }

    pub async fn ack(&self, consumer_group : &String, message_id : &String) -> RedisResult<()>{
        let mut conn = self.redis_client.get_multiplexed_async_connection().await?;

        let _ : i32 = redis::cmd("XACK")
                    .arg(&self.stream_name)
                    .arg(consumer_group)
                    .arg(&message_id)
                    .query_async(&mut conn)
                    .await?;
        
        println!("Acknowledged message : {}", message_id);
        Ok(())
    }
}