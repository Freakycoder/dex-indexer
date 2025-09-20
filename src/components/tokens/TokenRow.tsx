'use client';

import React from 'react';
import { Token } from '@/lib/types';
import { Zap } from 'lucide-react';
import { SparklineChart } from './SparklineChart';
import { formatPercentage, getPercentageColor, formatPrice, formatNumber } from '@/lib/utils';

interface TokenRowProps {
  token: Token;
  index: number;
}

export const TokenRow: React.FC<TokenRowProps> = ({ token, index }) => {
  return (
    <tr className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors cursor-pointer group">
      <td className="px-3 py-3 text-gray-500 text-xs">#{index + 1}</td>
      
      <td className="px-3 py-3">
        <div className="flex items-center space-x-2">
          <div 
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: token.chainColor }}
          >
            {token.chain === 'SOL' ? 'S' : token.chain === 'BASE' ? 'B' : token.chain[0]}
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-gray-700 rounded-full flex-shrink-0" />
            {token.tokenAddress && <div className="w-6 h-6 bg-gray-700 rounded-full -ml-2 flex-shrink-0" />}
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className="text-white font-medium text-sm">{token.token}</span>
              <span className="text-gray-500 text-xs">/ SOL</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 text-xs">{token.tokenSymbol}</span>
              {token.priceChange && (
                <span className="text-yellow-500 flex items-center text-xs">
                  <Zap className="w-3 h-3" />
                  {token.priceChange}
                </span>
              )}
              {token.tokenVersion && (
                <span className="text-gray-600 bg-gray-800 px-1 rounded text-[10px]">
                  {token.tokenVersion}
                </span>
              )}
              {token.tokenAddress && (
                <span className="text-gray-600 text-[10px]">{token.tokenAddress}</span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <div className="text-white text-sm">${formatPrice(token.price)}</div>
        {token.fdv && <div className="text-gray-500 text-xs">{token.fdv}</div>}
      </td>

      <td className="px-3 py-3 text-gray-400 text-sm">{token.age}</td>
      
      <td className="px-3 py-3 text-gray-400 text-sm">
        {formatNumber(token.txns)}
      </td>
      
      <td className="px-3 py-3 text-gray-400 text-sm">{token.volume}</td>
      
      <td className="px-3 py-3 text-gray-400 text-sm">
        {formatNumber(token.makers)}
      </td>
      
      <td className={`px-3 py-3 text-sm ${getPercentageColor(token.change5m)}`}>
        {formatPercentage(token.change5m)}
      </td>
      
      <td className={`px-3 py-3 text-sm ${getPercentageColor(token.change1h)}`}>
        {formatPercentage(token.change1h)}
      </td>
      
      <td className={`px-3 py-3 text-sm ${getPercentageColor(token.change6h)}`}>
        {formatPercentage(token.change6h)}
      </td>
      
      <td className={`px-3 py-3 text-sm ${getPercentageColor(token.change24h)}`}>
        {formatPercentage(token.change24h)}
      </td>
      
      <td className="px-3 py-3 text-gray-400 text-sm">{token.liquidity}</td>
      
      <td className="px-3 py-3">
        <SparklineChart data={token.sparklineData} isPositive={token.isPositive} />
      </td>
    </tr>
  );
};