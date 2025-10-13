import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export interface TransactionData {
  date: string;
  purchase_type: 'Buy' | 'Sell';
  usd_value: number | null;
  token_quantity: number;
  token_price: number;
  owner: string;
  dex_type: string;
  dex_tag: string;
  token_pair: string;
  token_name: string;
}

export interface CandleData {
  token_pair: string;
  timeframe: '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  timestamp: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buy_volume: number;
  sell_volume: number;
  trade_count?: number;
}

export interface PeriodStats {
  txns: number;
  volume: number;
  makers: number;
  buys: number;
  sells: number;
  buy_volume: number;
  sell_volume: number;
  buyers: number;
  sellers: number;
}

export interface PeriodStatsUpdate {
  token_pair: string;
  timeframe: 'FiveMins' | 'OneHour' | 'SixHours' | 'TwentyFourHours';
  price_change: number;
  period_stats: PeriodStats | null;
}

export interface PriceInfo {
  usd_current_price: number;
  sol_relative_price: number;
  token_pair?: string;
}

export interface TokenMetrics {
  '5m': { price_change: number; stats: PeriodStats | null };
  '1h': { price_change: number; stats: PeriodStats | null };
  '6h': { price_change: number; stats: PeriodStats | null };
  '24h': { price_change: number; stats: PeriodStats | null };
  currentPriceUSD?: number;
  currentPriceSOL?: number;
  marketCap?: number;
  fdv?: number;
  liquidity?: number;
}

export interface WebSocketRoom {
  id: string;
  name: string;
  transactions: TransactionData[];
  metrics: TokenMetrics;
  subscribers: Set<string>;
  candles: Map<string, CandleData[]>;
}

export interface GlobalWebSocketContextType {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  rooms: Map<string, WebSocketRoom>;
  activeRooms: string[];
  joinRoom: (roomId: string, subscriberId: string) => void;
  leaveRoom: (roomId: string, subscriberId: string) => void;
  getRoomTransactions: (roomId: string) => TransactionData[];
  getRoomMetrics: (roomId: string) => TokenMetrics | null;
  getRoomCandles: (roomId: string, timeframe: string) => CandleData[];
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

  const initializeRoom = (tokenPair: string): WebSocketRoom => {
    return {
      id: tokenPair,
      name: tokenPair,
      transactions: [],
      metrics: {
        '5m': { price_change: 0, stats: null },
        '1h': { price_change: 0, stats: null },
        '6h': { price_change: 0, stats: null },
        '24h': { price_change: 0, stats: null },
        currentPriceUSD: 0,
        currentPriceSOL: 0,
        marketCap: 0,
        fdv: 0,
        liquidity: 0,
      },
      subscribers: new Set(),
      candles: new Map()
    };
  };

  const addTransactionToRoom = useCallback((transaction: TransactionData) => {
    const tokenPair = extractTokenPair(transaction);
    
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      
      if (!newRooms.has(tokenPair)) {
        newRooms.set(tokenPair, initializeRoom(tokenPair));
        console.log(`🏠 Created new room: ${tokenPair}`);
      }
      
      const room = newRooms.get(tokenPair)!;
      room.transactions = [transaction, ...room.transactions].slice(0, 100);
      
      if (transaction.token_price) {
        room.metrics.currentPriceUSD = transaction.token_price;
        room.metrics.currentPriceSOL = transaction.token_price / 100;
      }
      
      console.log(`📨 Added transaction to room ${tokenPair} (${room.subscribers.size} subscribers)`);
      
      return newRooms;
    });
    
    setAllTransactions(prev => [transaction, ...prev].slice(0, 500));
  }, [extractTokenPair]);

  const updateRoomMetrics = useCallback((update: PeriodStatsUpdate) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      
      if (!newRooms.has(update.token_pair)) {
        newRooms.set(update.token_pair, initializeRoom(update.token_pair));
        console.log(`🏠 Created new room for metrics: ${update.token_pair}`);
      }
      
      const room = newRooms.get(update.token_pair)!;
      
      const timeframeMap: Record<string, keyof TokenMetrics> = {
        'FiveMins': '5m',
        'OneHour': '1h',
        'SixHours': '6h',
        'TwentyFourHours': '24h'
      };
      
      const key = timeframeMap[update.timeframe];
      if (key && (key === '5m' || key === '1h' || key === '6h' || key === '24h')) {
        room.metrics[key] = {
          price_change: update.price_change,
          stats: update.period_stats
        };
      }
      
      console.log(`📊 Updated metrics for ${update.token_pair} (${update.timeframe})`);
      
      return newRooms;
    });
  }, []);

  const updateRoomPrice = useCallback((priceInfo: PriceInfo, tokenPair: string) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      
      if (!newRooms.has(tokenPair)) {
        newRooms.set(tokenPair, initializeRoom(tokenPair));
        console.log(`🏠 Created new room for price: ${tokenPair}`);
      }
      
      const room = newRooms.get(tokenPair)!;
      room.metrics.currentPriceUSD = priceInfo.usd_current_price;
      room.metrics.currentPriceSOL = priceInfo.sol_relative_price;
      
      console.log(`💰 Updated price for ${tokenPair}: $${priceInfo.usd_current_price}`);
      
      return newRooms;
    });
  }, []);

  const addCandleToRoom = useCallback((candle: CandleData) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);

      // Ensure room exists
      if (!newRooms.has(candle.token_pair)) {
        newRooms.set(candle.token_pair, initializeRoom(candle.token_pair));
        console.log(`🏠 Created new room for candle: ${candle.token_pair}`);
      }

      const room = newRooms.get(candle.token_pair)!;
      const existingCandles = room.candles.get(candle.timeframe) || [];

      // Check if candle already exists - update it, otherwise append
      const existingIndex = existingCandles.findIndex(c => c.timestamp === candle.timestamp);
      
      let updatedCandles: CandleData[];
      if (existingIndex >= 0) {
        // Update existing candle
        updatedCandles = [...existingCandles];
        updatedCandles[existingIndex] = candle;
        console.log(`🔄 Updated candle: ${candle.token_pair} ${candle.timeframe} @ ${new Date(candle.timestamp).toISOString()}`);
      } else {
        // Append new candle and sort by timestamp
        updatedCandles = [...existingCandles, candle].sort((a, b) => a.timestamp - b.timestamp);
        console.log(`✨ New candle: ${candle.token_pair} ${candle.timeframe} @ ${new Date(candle.timestamp).toISOString()}`);
        
        // Limit to last 1000 candles per timeframe
        if (updatedCandles.length > 1000) {
          updatedCandles = updatedCandles.slice(-1000);
        }
      }

      room.candles.set(candle.timeframe, updatedCandles);

      return newRooms;
    });
  }, []);

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
          const data = JSON.parse(event.data);
          
          // Type 1: Transaction
          if (data.purchase_type && data.token_pair) {
            console.log('📡 Transaction:', data.token_pair, 'dex_tag:', data.dex_tag);
            addTransactionToRoom(data as TransactionData);
          } 
          // Type 2: Metrics Update
          else if (data.timeframe && data.token_pair && data.price_change !== undefined) {
            console.log('📊 Metrics Update:', data.token_pair, data.timeframe);
            updateRoomMetrics(data as PeriodStatsUpdate);
          }
          // Type 3: Current Price
          else if (data.usd_current_price !== undefined && data.sol_relative_price !== undefined) {
            console.log('💰 Price Update for:', data.token_pair || 'unknown');
            if (data.token_pair) {
              updateRoomPrice(data as PriceInfo, data.token_pair);
            }
          }
          // Type 4: OHLCV Candle - CRITICAL CHECK
          else if (
            data.token_pair && 
            data.timeframe &&
            data.timestamp !== undefined &&
            data.open !== undefined && 
            data.high !== undefined && 
            data.low !== undefined && 
            data.close !== undefined &&
            data.volume !== undefined
          ) {
            console.log('🕯️ Candle Update:', {
              pair: data.token_pair,
              timeframe: data.timeframe,
              timestamp: data.timestamp,
              date: new Date(data.timestamp).toISOString(),
              ohlc: `O:${data.open} H:${data.high} L:${data.low} C:${data.close}`,
              volume: data.volume
            });
            addCandleToRoom(data as CandleData);
          }
          // Unknown message type
          else {
            console.log('❓ Unknown message type:', Object.keys(data).join(', '));
            console.log('Full data:', data);
          }
        } catch (error) {
          console.error('❌ WebSocket: Failed to parse message:', error);
          console.log('Raw data:', event.data);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket: Connection closed (${event.code}): ${event.reason}`);
        setConnectionStatus('disconnected');
        isConnectingRef.current = false;
        
        // Reconnect after 3 seconds
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect...');
          connect();
        }, 3000);
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
  }, [url, addTransactionToRoom, updateRoomMetrics, updateRoomPrice, addCandleToRoom]);

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
        newRooms.set(roomId, initializeRoom(roomId));
        console.log(`🏠 Created room for subscriber: ${roomId}`);
      }
      
      const room = newRooms.get(roomId)!;
      room.subscribers.add(subscriberId);
      
      console.log(`👤 ${subscriberId} joined room ${roomId} (${room.subscribers.size} total)`);
      
      return newRooms;
    });
  }, []);

  const leaveRoom = useCallback((roomId: string, subscriberId: string) => {
    setRooms(prevRooms => {
      const newRooms = new Map(prevRooms);
      const room = newRooms.get(roomId);
      
      if (room) {
        room.subscribers.delete(subscriberId);
        console.log(`👋 ${subscriberId} left room ${roomId} (${room.subscribers.size} remaining)`);
      }
      
      return newRooms;
    });
  }, []);

  const getRoomTransactions = useCallback((roomId: string): TransactionData[] => {
    const room = rooms.get(roomId);
    return room ? room.transactions : [];
  }, [rooms]);

  const getRoomMetrics = useCallback((roomId: string): TokenMetrics | null => {
    const room = rooms.get(roomId);
    return room ? room.metrics : null;
  }, [rooms]);

  const getRoomCandles = useCallback((roomId: string, timeframe: string): CandleData[] => {
    const room = rooms.get(roomId);
    const candles = room?.candles.get(timeframe) || [];
    
    if (candles.length > 0) {
      console.log(`📊 Fetching ${candles.length} candles for ${roomId} ${timeframe}`);
      console.log(`   Latest: ${new Date(candles[candles.length - 1].timestamp).toISOString()}`);
    }
    
    return candles;
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
  }, []);

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
    getRoomMetrics,
    getRoomCandles,
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