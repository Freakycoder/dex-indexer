'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, User } from 'lucide-react';
import { TransactionData } from '@/context/WebsocketContext';
import { formatPrice } from '@/lib/utils';

interface TokenTransactionTableProps {
  tokenPair: string;
  transactions: TransactionData[];
}

export const TokenTransactionTable: React.FC<TokenTransactionTableProps> = ({
  tokenPair,
  transactions
}) => {
  const [displayedTransactions, setDisplayedTransactions] = useState<TransactionData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_LOAD = 20;

  // Load initial transactions
  useEffect(() => {
    setDisplayedTransactions(transactions.slice(0, ITEMS_PER_LOAD));
    setHasMore(transactions.length > ITEMS_PER_LOAD);
  }, [transactions]);

  // Load more transactions
  const loadMore = () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    
    setTimeout(() => {
      const currentLength = displayedTransactions.length;
      const newTransactions = transactions.slice(currentLength, currentLength + ITEMS_PER_LOAD);
      
      setDisplayedTransactions(prev => [...prev, ...newTransactions]);
      setHasMore(currentLength + ITEMS_PER_LOAD < transactions.length);
      setIsLoading(false);
    }, 300);
  };

  // Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      loadMore();
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Format wallet address
  const formatAddress = (address: string): string => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate SOL amount from USD value and token price
  const calculateSolAmount = (transaction: TransactionData): number => {
    if (!transaction.usd_value || !transaction.token_price) return 0;
    // Assuming SOL price around $100 for calculation (in real app, get from WebSocket)
    const solPrice = 100; 
    return transaction.usd_value / solPrice;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table Header */}
      <div className="border-b border-gray-900 px-6 py-3 bg-[#0b0e11]">
        <h2 className="text-white font-medium">Transactions</h2>
      </div>

      {/* Scrollable Table Container */}
      <div 
        ref={tableRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        onScroll={handleScroll}
      >
        <table className="w-full">
          <thead className="sticky top-0 bg-[#0b0e11] border-b border-gray-900 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">DATE</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">TYPE</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">USD</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">
                {tokenPair.split('/')[0]}
              </th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">SOL</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">PRICE</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">MAKER</th>
              <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">TXN</th>
            </tr>
          </thead>
          <tbody>
            {displayedTransactions.map((transaction, index) => {
              const solAmount = calculateSolAmount(transaction);
              
              return (
                <tr 
                  key={`${transaction.date}-${index}`}
                  className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors"
                >
                  {/* Date */}
                  <td className="px-3 py-3 text-gray-400 text-sm">
                    {formatTimeAgo(transaction.date)}
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      transaction.purchase_type === 'Buy' 
                        ? 'bg-green-900/30 text-green-500' 
                        : 'bg-red-900/30 text-red-500'
                    }`}>
                      {transaction.purchase_type}
                    </span>
                  </td>

                  {/* USD */}
                  <td className="px-3 py-3 text-white text-sm font-medium">
                    ${transaction.usd_value?.toLocaleString() || '0'}
                  </td>

                  {/* Token Amount */}
                  <td className="px-3 py-3 text-gray-400 text-sm">
                    {transaction.token_quantity?.toLocaleString() || '0'}
                  </td>

                  {/* SOL Amount */}
                  <td className="px-3 py-3 text-gray-400 text-sm">
                    {solAmount.toFixed(3)}
                  </td>

                  {/* Price */}
                  <td className="px-3 py-3 text-white text-sm">
                    ${formatPrice(transaction.token_price || 0)}
                  </td>

                  {/* Maker */}
                  <td className="px-3 py-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400 text-sm font-mono">
                        {formatAddress(transaction.owner)}
                      </span>
                    </div>
                  </td>

                  {/* Transaction Link */}
                  <td className="px-3 py-3">
                    <button 
                      className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
                      onClick={() => {
                        // In real app, open transaction on Solscan
                        console.log('Open transaction details for', transaction);
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Loading Row */}
            {isLoading && (
              <tr className="border-b border-gray-900">
                <td colSpan={8} className="px-3 py-6 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full"></div>
                    <span className="text-gray-400 text-sm">Loading more transactions...</span>
                  </div>
                </td>
              </tr>
            )}

            {/* No More Data */}
            {!hasMore && displayedTransactions.length > 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-500 text-sm">
                  No more transactions to load
                </td>
              </tr>
            )}

            {/* Empty State */}
            {displayedTransactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center">
                  <div className="text-gray-500">
                    <div className="text-lg mb-2">No transactions yet</div>
                    <div className="text-sm">Transactions for {tokenPair} will appear here in real-time</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-900 px-6 py-3 bg-[#0b0e11]">
        <div className="text-sm text-gray-400">
          Showing <span className="text-white">{displayedTransactions.length}</span> of{' '}
          <span className="text-white">{transactions.length}</span> transactions for {tokenPair}
        </div>
      </div>
    </div>
  );
};