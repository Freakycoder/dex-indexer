'use client';

import React from 'react';
import { Token } from '@/data/DataTypes';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { SparklineChart } from './SparklineChart';
import { formatPercentage, getPercentageColor, formatPrice, formatNumber } from '@/lib/utils';

interface TokenRowProps {
  token: Token;
  index: number;
}

export const TokenRow: React.FC<TokenRowProps> = ({ token, index }) => {
  // Pulse animation for new transactions
  const pulseStyle = {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  const keyframes = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: .5;
      }
    }
  `;

  return (
    <>
      <style>{keyframes}</style>
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
                <span className="text-gray-500 text-xs">/ {token.tokenPair?.split('/')[1] || 'SOL'}</span>
                {/* Live indicator */}
                {token.age === 'now' && (
                  <span className="flex items-center">
                    <span 
                      className="w-2 h-2 bg-green-500 rounded-full"
                      style={pulseStyle}
                    />
                    <span className="text-green-500 text-xs ml-1">LIVE</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 text-xs">{token.tokenSymbol}</span>
                {token.priceChange && (
                  <span className="text-yellow-500 flex items-center text-xs">
                    <Zap className="w-3 h-3" />
                    {token.priceChange}
                  </span>
                )}
                {token.tokenAddress && (
                  <span className="text-gray-600 text-[10px]">{token.tokenAddress}</span>
                )}
                {/* Buy/Sell indicator */}
                <span className="flex items-center space-x-1 ml-2">
                  <span className="text-green-500 text-xs flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    {token.buys}
                  </span>
                  <span className="text-red-500 text-xs flex items-center">
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                    {token.sells}
                  </span>
                </span>
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
        
        <td className="px-3 py-3 text-gray-400 text-sm">{token.volumeFormatted}</td>
        
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
    </>
  );
};