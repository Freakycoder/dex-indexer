use redis::{Client, RedisError};

#[derive(Debug)]
struct QueueManager{
    redis_client : Client
}

impl QueueManager {
    fn new() -> Result<Self, RedisError>{
        println!("Initializing redis queue...");
        let redis_url = "redis://localhost:6379";
        let redis_client = Client::open(redis_url).map_err(|e|{
            println!("Couldn't initialize a redis client : {}",e);
            e
        })?;
        Ok(Self { redis_client: redis_client })
    }

    fn enqueue_message(){
        
    }
}