// src/components/RoomSelector.tsx

import React from 'react';
import { useAvailableRooms } from '../hooks/useWebsocket';
import { useGlobalWebSocket } from '../context/WebsocketContext';

interface RoomSelectorProps {
  selectedRoom?: string;
  onRoomSelect: (roomId: string) => void;
  className?: string;
}

export const RoomSelector: React.FC<RoomSelectorProps> = ({ 
  selectedRoom, 
  onRoomSelect, 
  className = "" 
}) => {
  const { rooms, connectionStatus } = useAvailableRooms();
  const globalWs = useGlobalWebSocket();

  // Sort rooms by activity and transaction count
  const sortedRooms = rooms.sort((a, b) => {
    // Active rooms first
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1;
    }
    // Then by transaction count
    return b.transactionCount - a.transactionCount;
  });

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Token Pairs</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`}></div>
          <span className="text-sm text-gray-600 capitalize">{connectionStatus}</span>
        </div>
      </div>

      {/* Connection Controls */}
      {connectionStatus !== 'connected' && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Not connected'}
            </span>
            <button
              onClick={globalWs.connect}
              disabled={connectionStatus === 'connecting'}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="space-y-2">
        {sortedRooms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-sm">No token pairs available</p>
            <p className="text-xs text-gray-400 mt-1">
              {connectionStatus === 'connected' ? 'Waiting for transactions...' : 'Connect to see pairs'}
            </p>
          </div>
        )}

        {sortedRooms.map((room) => (
          <div
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              selectedRoom === room.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{room.name}</span>
                  {room.isActive && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600">Live</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>{room.transactionCount} transactions</span>
                  <span>{room.subscriberCount} viewers</span>
                  {room.lastTransaction && (
                    <span>
                      Last: {new Date(room.lastTransaction.date).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Transaction type indicator */}
              {room.lastTransaction && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  room.lastTransaction.purchase_type === 'Buy'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {room.lastTransaction.purchase_type}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-800">{rooms.length}</div>
            <div className="text-gray-600">Total Pairs</div>
          </div>
          <div>
            <div className="font-semibold text-green-600">
              {rooms.filter(r => r.isActive).length}
            </div>
            <div className="text-gray-600">Active</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600">
              {rooms.reduce((sum, r) => sum + r.subscriberCount, 0)}
            </div>
            <div className="text-gray-600">Viewers</div>
          </div>
        </div>
      </div>
    </div>
  );
};