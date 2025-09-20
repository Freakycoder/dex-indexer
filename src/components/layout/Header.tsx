'use client';

import React from 'react';

interface HeaderProps {
  connectionStatus?: string;
  transactionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ connectionStatus, transactionCount = 0 }) => {
  // Real-time volume calculation (mock for now)
  const volume24h = (transactionCount * 1000000).toLocaleString();
  const txns24h = (transactionCount * 1000).toLocaleString();

  return (
    <div className="border-b border-gray-900 px-6 py-3 bg-[#0b0e11]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="text-gray-400 text-sm">
            24H VOLUME: <span className="text-white font-bold ml-1">${volume24h}</span>
          </div>
          <div className="text-gray-400 text-sm">
            24H TXNS: <span className="text-white font-bold ml-1">{txns24h}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-xs">
            <span className="text-gray-500">Status: </span>
            <span className={`font-medium ${
              connectionStatus === 'connected' ? 'text-green-500' : 
              connectionStatus === 'connecting' ? 'text-yellow-500' : 
              'text-red-500'
            }`}>
              {connectionStatus || 'disconnected'}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Live Tokens: </span>
            <span className="text-white font-medium">{transactionCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};