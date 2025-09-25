'use client';

import React from 'react';
import { X } from 'lucide-react';
import { TokenHeader } from './TokenHeader';
import { TokenChart } from './TokenChart';
import { TokenTransactionTable } from './TokenTransactionTable';
import { useWebSocketRoom } from '@/hooks/useWebsocket';
import { Token } from '@/data/DataTypes';

interface TokenDetailViewProps {
  token: Token;
  onClose: () => void;
}

export const TokenDetailView: React.FC<TokenDetailViewProps> = ({ token, onClose }) => {
  const { 
    transactions, 
    connectionStatus, 
    isSubscribed,
    subscriberCount 
  } = useWebSocketRoom(token.tokenPair, true);

  // Loading state while establishing connection
  if (connectionStatus !== 'connected' || !isSubscribed) {
    return (
      <div className="flex-1 flex flex-col bg-[#0b0e11]">
        <div className="border-b border-gray-900 px-6 py-3 flex items-center justify-between">
          <div className="text-gray-400">Connecting to {token.tokenPair}...</div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">
              Establishing room connection...
            </div>
            <div className="text-gray-600 text-sm">
              Status: <span className="text-yellow-500">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e11] overflow-hidden">
      {/* Header with close button */}
      <div className="border-b border-gray-900 px-6 py-3 flex items-center justify-between">
        <div className="text-white font-medium">
          {token.tokenPair} • Raydium • dexscreener.com
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Token Header with stats */}
      <TokenHeader token={token} transactions={transactions} subscriberCount={subscriberCount} />

      {/* Chart Area */}
      <div className="border-b border-gray-900">
        <TokenChart />
      </div>

      {/* Transaction Table */}
      <div className="flex-1 overflow-hidden">
        <TokenTransactionTable 
          tokenPair={token.tokenPair}
          transactions={transactions} 
        />
      </div>
    </div>
  );
};