'use client';

import React from 'react';
import { Token, SortConfig } from '@/data/DataTypes';
import { TokenRow } from './TokenRow';
import { Info } from 'lucide-react';

interface TokenTableProps {
  tokens: Token[];
  sortConfig: SortConfig;
  onSort: (key: keyof Token) => void;
  currentPage: number;
  itemsPerPage: number;
}

export const TokenTable: React.FC<TokenTableProps> = ({ 
  tokens, 
  sortConfig, 
  onSort,
  currentPage,
  itemsPerPage
}) => {
  const getSortIcon = (key: keyof Token) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? '↓' : '↑';
  };

  return (
    <table className="w-full">
      <thead className="sticky top-0 bg-[#0b0e11] border-b border-gray-900 z-10">
        <tr>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-12">#</th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">
            <button 
              onClick={() => onSort('token')} 
              className="flex items-center space-x-1 hover:text-white transition-colors"
            >
              <span>TOKEN</span>
              {getSortIcon('token') && <span className="ml-1">{getSortIcon('token')}</span>}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">
            <button 
              onClick={() => onSort('price')} 
              className="flex items-center space-x-1 hover:text-white transition-colors"
            >
              <span>PRICE</span>
              <Info className="w-3 h-3 ml-1" />
              {getSortIcon('price') && <span className="ml-1">{getSortIcon('price')}</span>}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-20">AGE</th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">
            <button 
              onClick={() => onSort('txns')} 
              className="hover:text-white transition-colors"
            >
              TXNS {getSortIcon('txns')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">
            <button 
              onClick={() => onSort('volume')} 
              className="hover:text-white transition-colors"
            >
              VOLUME {getSortIcon('volume')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">MAKERS</th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-20">
            <button 
              onClick={() => onSort('change5m')} 
              className="hover:text-white transition-colors"
            >
              5M {getSortIcon('change5m')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-20">
            <button 
              onClick={() => onSort('change1h')} 
              className="hover:text-white transition-colors"
            >
              1H {getSortIcon('change1h')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-20">
            <button 
              onClick={() => onSort('change6h')} 
              className="hover:text-white transition-colors"
            >
              6H {getSortIcon('change6h')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-20">
            <button 
              onClick={() => onSort('change24h')} 
              className="hover:text-white transition-colors"
            >
              24H {getSortIcon('change24h')}
            </button>
          </th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal">LIQUIDITY</th>
          <th className="px-3 py-3 text-left text-xs text-gray-500 font-normal w-24"></th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token, index) => (
          <TokenRow 
            key={`${token.token}-${index}`} 
            token={token} 
            index={(currentPage - 1) * itemsPerPage + index} 
          />
        ))}
      </tbody>
    </table>
  );
};