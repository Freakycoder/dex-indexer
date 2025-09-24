import { useEffect, useState, useCallback, useRef } from 'react';
import { useGlobalWebSocket, TransactionData } from '../context/WebsocketContext';

interface UseWebSocketRoomReturn {
  transactions: TransactionData[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriberCount: number;
  isSubscribed: boolean;
  joinRoom: () => void;
  leaveRoom: () => void;
  clearTransactions: () => void;
}

export const useWebSocketRoom = (roomId: string, autoJoin: boolean = true): UseWebSocketRoomReturn => {
  const globalWs = useGlobalWebSocket();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Generate unique subscriber ID
  const subscriberIdRef = useRef(`subscriber-${roomId}-${Math.random().toString(36).substr(2, 9)}`);
  const subscriberId = subscriberIdRef.current;

  // Get current room data
  const room = globalWs.rooms.get(roomId);
  const subscriberCount = room ? room.subscribers.size : 0;

  // Update local transactions when room transactions change
  useEffect(() => {
    if (isSubscribed) {
      const roomTransactions = globalWs.getRoomTransactions(roomId);
      setTransactions(roomTransactions);
    }
  }, [globalWs.rooms, roomId, isSubscribed, globalWs]);

  const joinRoom = useCallback(() => {
    if (!isSubscribed) {
      globalWs.joinRoom(roomId, subscriberId);
      setIsSubscribed(true);
      
      // Get existing transactions for this room
      const existingTransactions = globalWs.getRoomTransactions(roomId);
      setTransactions(existingTransactions);
      
      console.log(`🚪 Joined room: ${roomId}`);
    }
  }, [globalWs, roomId, subscriberId, isSubscribed]);

  const leaveRoom = useCallback(() => {
    if (isSubscribed) {
      globalWs.leaveRoom(roomId, subscriberId);
      setIsSubscribed(false);
      console.log(`🚪 Left room: ${roomId}`);
    }
  }, [globalWs, roomId, subscriberId, isSubscribed]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  // Auto-join room on mount if autoJoin is true
  useEffect(() => {
    if (autoJoin) {
      joinRoom();
    }

    // Cleanup: leave room on unmount
    return () => {
      leaveRoom();
    };
  }, [autoJoin, joinRoom, leaveRoom]);

  return {
    transactions,
    connectionStatus: globalWs.connectionStatus,
    subscriberCount,
    isSubscribed,
    joinRoom,
    leaveRoom,
    clearTransactions,
  };
};

// Hook for getting all available rooms
export const useAvailableRooms = () => {
  const globalWs = useGlobalWebSocket();
  
  const availableRooms = Array.from(globalWs.rooms.entries()).map(([roomId, room]) => ({
    id: roomId,
    name: room.name,
    transactionCount: room.transactions.length,
    subscriberCount: room.subscribers.size,
    isActive: room.subscribers.size > 0,
    lastTransaction: room.transactions[0] || null,
  }));

  return {
    rooms: availableRooms,
    activeRooms: globalWs.activeRooms,
    connectionStatus: globalWs.connectionStatus,
  };
};