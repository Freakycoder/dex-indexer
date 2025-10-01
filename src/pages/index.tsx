'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sidebar } from '@/components/layout/SideBar';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/layout/FilterBar';
import { TokenTable } from '@/components/tokens/TokenTable';
import { TokenDetailView } from '@/components/tokens/TokenDetailView';
import { SearchModal } from '@/components/modals/SearchModal';
import { Pagination } from '@/components/Pagination';
import { SortConfig, Token } from '@/data/DataTypes';
import { useGlobalWebSocket, TransactionData } from '@/context/WebsocketContext';

// Inline styles for scrollbar
const scrollbarStyles = `
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 9999px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #4b5563;
  }
`;

export default function Home() {
  const [activeRoute, setActiveRoute] = useState('new-pairs');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [trendingFilter, setTrendingFilter] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const itemsPerPage = 15;

  const { getAllTransactions, connectionStatus, rooms } = useGlobalWebSocket();

  // Transform WebSocket transactions into token format
  const tokens: Token[] = useMemo(() => {
    const tokenMap = new Map<string, Token>();
    const allTransactions = getAllTransactions();

    // Group transactions by token pair
    allTransactions.forEach((transaction, index) => {
      const tokenPair = transaction.token_pair;
      
      if (!tokenMap.has(tokenPair)) {
        // Generate sparkline data from transactions
        const sparklineData = Array.from({ length: 20 }, () => ({
          value: Math.random() * 100
        }));

        const newToken = {
          id: tokenPair,
          rank: tokenMap.size + 1,
          chain: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
          chainColor: '#9945FF',
          tokenSymbol: tokenPair.split('/')[0],
          tokenName: transaction.token_name,
          dexTag: transaction.dex_tag,
          dexName: transaction.dex_type,
          tokenPair: tokenPair,
          price: transaction.token_price || 0,
          priceChange: Math.floor(Math.random() * 100),
          age: getAge(transaction.date),
          txns: 1,
          volume: transaction.usd_value || 0,
          volumeFormatted: formatVolume(transaction.usd_value || 0),
          makers: 1,
          buys: transaction.purchase_type === 'Buy' ? 1 : 0,
          sells: transaction.purchase_type === 'Sell' ? 1 : 0,
          change5m: (Math.random() - 0.5) * 20,
          change1h: (Math.random() - 0.5) * 50,
          change6h: (Math.random() - 0.5) * 100,
          change24h: (Math.random() - 0.5) * 200,
          liquidity: `$${Math.floor(Math.random() * 500)}K`,
          fdv: `$${Math.floor(Math.random() * 10)}M`,
          sparklineData,
          isPositive: transaction.purchase_type === 'Buy',
          lastTransaction: transaction
        };
        
        console.log('🎯 Creating token with dexTag:', newToken.dexTag, 'dexName:', newToken.dexName);
        tokenMap.set(tokenPair, newToken);
      } else {
        const existingToken = tokenMap.get(tokenPair)!;
        existingToken.txns += 1;
        existingToken.volume += transaction.usd_value || 0;
        existingToken.volumeFormatted = formatVolume(existingToken.volume);
        if (transaction.purchase_type === 'Buy') {
          existingToken.buys += 1;
        } else {
          existingToken.sells += 1;
        }
        existingToken.lastTransaction = transaction;
        existingToken.price = transaction.token_price || existingToken.price;
      }
    });

    return Array.from(tokenMap.values()).slice(0, 50); // Limit to 50 tokens
  }, [getAllTransactions]);

  // Helper functions
  function getAge(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'now';
  }

  function formatVolume(volume: number): string {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  }

  // Sorting logic
  const sortedTokens = useMemo(() => {
    if (!tokens.length) return [];
    
    let sortableTokens = [...tokens];
    if (sortConfig.key) {
      sortableTokens.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Token] as any;
        let bValue = b[sortConfig.key as keyof Token] as any;
        
        if (sortConfig.key === 'volumeFormatted') {
          aValue = a.volume;
          bValue = b.volume;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTokens;
  }, [tokens, sortConfig]);

  // Pagination
  const paginatedTokens = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTokens.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTokens, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(tokens.length / itemsPerPage);

  const handleSort = (key: keyof Token) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const handleTokenClick = (token: Token) => {
    setSelectedToken(token);
  };

  const handleCloseTokenDetail = () => {
    setSelectedToken(null);
  };

  // Reset to first page when tokens change
  useEffect(() => {
    setCurrentPage(1);
  }, [tokens.length]);

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div className="flex h-screen bg-[#0b0e11] text-white overflow-hidden">
        <Sidebar 
          activeRoute={activeRoute} 
          setActiveRoute={setActiveRoute}
          onSearchClick={() => setSearchModalOpen(true)}
        />
        
        <div className="flex-1 flex flex-col">
          {/* Conditional Rendering: Token Detail or Main View */}
          {selectedToken ? (
            <TokenDetailView 
              token={selectedToken} 
              onClose={handleCloseTokenDetail} 
            />
          ) : (
            <>
              <Header connectionStatus={connectionStatus} transactionCount={tokens.length} />
              <FilterBar 
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
                trendingFilter={trendingFilter}
                setTrendingFilter={setTrendingFilter}
              />
              
              <div className="flex-1 overflow-auto scrollbar-thin">
                {tokens.length > 0 ? (
                  <TokenTable 
                    tokens={paginatedTokens}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onTokenClick={handleTokenClick}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-gray-500 text-lg mb-2">
                        {connectionStatus === 'connected' ? 'Waiting for transactions...' : 'Connecting to WebSocket...'}
                      </div>
                      <div className="text-gray-600 text-sm">
                        Status: <span className={connectionStatus === 'connected' ? 'text-green-500' : 'text-yellow-500'}>
                          {connectionStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {tokens.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={tokens.length}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </div>

        <SearchModal 
          isOpen={searchModalOpen} 
          onClose={() => setSearchModalOpen(false)} 
          tokens={tokens}
        />
      </div>
    </>
  );
}