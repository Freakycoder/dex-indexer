import { useEffect, useState, useRef, useCallback } from 'react';

export interface TransactionData {
  date: string;
  purchase_type: 'Buy' | 'Sell';
  usd: number | null;
  token_quantity: number;
  token_price: number;
  owner: string;
  dex_type: string;
}

export interface UseWebSocketReturn {
  transactions: TransactionData[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastMessage: string | null;
  connect: () => void;
  disconnect: () => void;
  clearTransactions: () => void;
}

export const useWebSocket = (url: string = 'ws://localhost:3001/ws'): UseWebSocketReturn => {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected to', url);
        setConnectionStatus('connected');
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        console.log('📡 Received message:', event.data);
        setLastMessage(event.data);
        
        try {
          const transactionData: TransactionData = JSON.parse(event.data);
          setTransactions(prev => [transactionData, ...prev].slice(0, 100)); // Keep last 100 transactions
        } catch (error) {
          console.error('Failed to parse transaction data:', error);
          console.log('Raw message:', event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect after 3 seconds if not manually disconnected
        if (event.code !== 1000) { // 1000 is normal closure
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    transactions,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    clearTransactions,
  };
};