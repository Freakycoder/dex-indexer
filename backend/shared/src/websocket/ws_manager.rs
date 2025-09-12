use tokio::sync::broadcast;
use futures::{SinkExt, StreamExt};

pub struct WebsocketManager{
    sender : broadcast::Sender<String>
}

impl WebsocketManager {
    pub fn new() -> Self{
        let (sender, stream) = broadcast::channel(10);
        Self { 
            sender
        }
    }

    pub fn send_message(&self, message : String){
        match self.sender.send(message){
            Ok(count) => {
                println!("message sent to {} client", count)
            }
            Err(e) => {
                println!("No clients connected to recive message : {}",e)
            }
        }
    }
}