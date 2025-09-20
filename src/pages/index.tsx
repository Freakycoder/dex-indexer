'use client';

import { useState, useMemo } from 'react';
import { Sidebar } from '@/components/layout/SideBar';
import { Header } from '@/components/layout/Header';
import { FilterBar } from '@/components/layout/FilterBar';
import { TokenTable } from '@/components/tokens/TokenTable';
import { SearchModal } from '@/components/modals/SearchModal';
import { Pagination } from '@/components/Pagination';
import { mockTokens } from '@/data/mockData';
import { SortConfig, Token } from '@/data/DataTypes';

export default function Home() {
  const [activeRoute, setActiveRoute] = useState('new-pairs');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [trendingFilter, setTrendingFilter] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Sorting logic
  const sortedTokens = useMemo(() => {
    let sortableTokens = [...mockTokens];
    if (sortConfig.key) {
      sortableTokens.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Token] as any;
        let bValue = b[sortConfig.key as keyof Token] as any;
        
        if (typeof aValue === 'string' && aValue.includes('$')) {
          aValue = parseFloat(aValue.replace(/[$,KMB]/g, '')) * 
            (aValue.includes('B') ? 1000000000 : aValue.includes('M') ? 1000000 : aValue.includes('K') ? 1000 : 1);
        }
        if (typeof bValue === 'string' && bValue.includes('$')) {
          bValue = parseFloat(bValue.replace(/[$,KMB]/g, '')) * 
            (bValue.includes('B') ? 1000000000 : bValue.includes('M') ? 1000000 : bValue.includes('K') ? 1000 : 1);
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
  }, [sortConfig]);

  // Pagination
  const paginatedTokens = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTokens.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTokens, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(mockTokens.length / itemsPerPage);

  const handleSort = (key: keyof Token) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  return (
    <div className="flex h-screen bg-[#0b0e11] text-white overflow-hidden">
      <Sidebar 
        activeRoute={activeRoute} 
        setActiveRoute={setActiveRoute}
        onSearchClick={() => setSearchModalOpen(true)}
      />
      
      <div className="flex-1 flex flex-col">
        <Header />
        <FilterBar 
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          trendingFilter={trendingFilter}
          setTrendingFilter={setTrendingFilter}
        />
        
        <div className="flex-1 overflow-auto scrollbar-thin">
          <TokenTable 
            tokens={paginatedTokens}
            sortConfig={sortConfig}
            onSort={handleSort}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
          />
        </div>
        
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={mockTokens.length}
          onPageChange={setCurrentPage}
        />
      </div>

      <SearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
      />
    </div>
  );
}