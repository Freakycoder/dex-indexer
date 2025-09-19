import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface TransactionData {
  date: string;
  purchase_type: 'Buy' | 'Sell';
  usd: number | null;
  token_quantity: number;
  token_price: number;
  owner: string;
  dex_type: string;
  token_pair: string;
  token_name: string;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  transactions: TransactionData[];
  subscribers: Set<string>;
}

export interface GlobalWebSocketContextType {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  rooms: Map<string, WebSocketRoom>;
  activeRooms: string[];
  
  joinRoom: (roomId: string, subscriberId: string) => void;
  leaveRoom: (roomId: string, subscriberId: string) => void;
  getRoomTransactions: (roomId: string) => TransactionData[];
  connect: () => void;
  disconnect: () => void;
  getAllTransactions: () => TransactionData[];
}

const WebSocketContext = createContext<GlobalWebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
  url?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  url = 'ws://localhost:3001/ws' 
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [rooms, setRooms] = useState<Map<string, WebSocketRoom>>(new Map());
  const [allTransactions, setAllTransactions] = useState<TransactionData[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectingRef = useRef(false);

  const extractTokenPair = useCallback((transaction: TransactionData): string => {
    return transaction.token_pair;
  }, []);

  const addTransactionToRoom = useCallback((transaction: TransactionData) => {
    const tokenPair = extractTokenPair(transaction);
    
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      
      if (!newRooms.has(tokenPair)) {
        newRooms.set(tokenPair, {
          id: tokenPair,
          name: tokenPair,
          transactions: [],
          subscribers: new Set(),
        });
        console.log(`🏠 Created new room: ${tokenPair}`);
      }
      
      const room = newRooms.get(tokenPair)!;
      room.transactions = [transaction, ...room.transactions].slice(0, 100); // Keep last 100 per room
      
      console.log(`📨 Added transaction to room ${tokenPair} (${room.subscribers.size} subscribers)`);
      
      return newRooms;
    });
    
    setAllTransactions(prev => [transaction, ...prev].slice(0, 500)); // Keep last 500 globally
  }, [extractTokenPair]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ WebSocket: Already connecting or connected');
      return;
    }

    console.log('🔄 WebSocket: Connecting to', url);
    setConnectionStatus('connecting');
    isConnectingRef.current = true;

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket: Global connection established');
        setConnectionStatus('connected');
        isConnectingRef.current = false;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const transaction: TransactionData = JSON.parse(event.data);
          console.log('📡 WebSocket: Received transaction:', transaction);
          addTransactionToRoom(transaction);
        } catch (error) {
          console.error('❌ WebSocket: Failed to parse transaction:', error);
          console.log('Raw data:', event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket: Connection closed (${event.code}): ${event.reason}`);
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket: Connection error:', error);
        setConnectionStatus('error');
        isConnectingRef.current = false;
      };

    } catch (error) {
      console.error('❌ WebSocket: Failed to create connection:', error);
      setConnectionStatus('error');
      isConnectingRef.current = false;
    }
  }, [url, addTransactionToRoom]);

  const disconnect = useCallback(() => {
    console.log('🛑 WebSocket: Manual disconnect');
    
    isConnectingRef.current = false;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const joinRoom = useCallback((roomId: string, subscriberId: string) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      
      if (!newRooms.has(roomId)) {
        // Create room if it doesn't exist
        newRooms.set(roomId, {
          id: roomId,
          name: roomId,
          transactions: [],
          subscribers: new Set(),
        });
        console.log(`🏠 Created room for subscriber: ${roomId}`);
      }
      
      const room = newRooms.get(roomId)!;
      room.subscribers.add(subscriberId);
      
      console.log(`👤 ${subscriberId} joined room ${roomId} (${room.subscribers.size} total subscribers)`);
      
      return newRooms;
    });
  }, []);

  const leaveRoom = useCallback((roomId: string, subscriberId: string) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      const room = newRooms.get(roomId);
      
      if (room) {
        room.subscribers.delete(subscriberId);
        console.log(`👋 ${subscriberId} left room ${roomId} (${room.subscribers.size} remaining subscribers)`);
        
        // Keep room even if no subscribers (for transaction history)
      }
      
      return newRooms;
    });
  }, []);

  const getRoomTransactions = useCallback((roomId: string): TransactionData[] => {
    const room = rooms.get(roomId);
    return room ? room.transactions : [];
  }, [rooms]);

  const getAllTransactions = useCallback((): TransactionData[] => {
    return allTransactions;
  }, [allTransactions]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Get active rooms (rooms with subscribers)
  const activeRooms = Array.from(rooms.entries())
    .filter(([_, room]) => room.subscribers.size > 0)
    .map(([roomId]) => roomId);

  const contextValue: GlobalWebSocketContextType = {
    connectionStatus,
    rooms,
    activeRooms,
    joinRoom,
    leaveRoom,
    getRoomTransactions,
    connect,
    disconnect,
    getAllTransactions,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useGlobalWebSocket = (): GlobalWebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useGlobalWebSocket must be used within a WebSocketProvider');
  }
  return context;
};