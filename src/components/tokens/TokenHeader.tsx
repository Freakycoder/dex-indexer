'use client';

import React, { useMemo } from 'react';
import { Token } from '@/data/DataTypes';
import { TransactionData } from '@/context/WebsocketContext';
import { formatPrice, formatPercentage, getPercentageColor, formatNumber } from '@/lib/utils';

interface TokenHeaderProps {
  token: Token;
  transactions: TransactionData[];
  subscriberCount: number;
}

export const TokenHeader: React.FC<TokenHeaderProps> = ({ 
  token, 
  transactions, 
  subscriberCount 
}) => {
  // Calculate real-time stats from transactions
  const stats = useMemo(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const buys = transactions.filter(tx => tx.purchase_type === 'Buy');
    const sells = transactions.filter(tx => tx.purchase_type === 'Sell');
    
    const buyVolume = buys.reduce((sum, tx) => sum + (tx.usd || 0), 0);
    const sellVolume = sells.reduce((sum, tx) => sum + (tx.usd || 0), 0);
    const totalVolume = buyVolume + sellVolume;

    // Get unique makers (traders)
    const uniqueBuyers = new Set(buys.map(tx => tx.owner)).size;
    const uniqueSellers = new Set(sells.map(tx => tx.owner)).size;
    const uniqueMakers = new Set(transactions.map(tx => tx.owner)).size;

    // Calculate price changes (using current token price vs historical)
    // For now using mock data, in real app you'd calculate from transaction history
    const priceChange5m = token.change5m || (Math.random() - 0.5) * 10;
    const priceChange1h = token.change1h || (Math.random() - 0.5) * 20;
    const priceChange6h = token.change6h || (Math.random() - 0.5) * 50;
    const priceChange24h = token.change24h || (Math.random() - 0.5) * 100;

    return {
      currentPrice: token.price || (transactions[0]?.token_price || 0),
      totalTxns: transactions.length,
      buys: buys.length,
      sells: sells.length,
      totalVolume,
      buyVolume,
      sellVolume,
      makers: uniqueMakers,
      buyers: uniqueBuyers,
      sellers: uniqueSellers,
      priceChange5m,
      priceChange1h,
      priceChange6h,
      priceChange24h,
    };
  }, [transactions, token]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <div className="border-b border-gray-900 p-6 bg-[#0b0e11]">
      <div className="flex items-center justify-between mb-6">
        {/* Token Info and Price */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <img 
              src="https://assets.coingecko.com/coins/images/4128/large/solana.png" 
              alt="Solana" 
              className="w-8 h-8 rounded-full"
            />
            <img 
              src="https://static1.tokenterminal.com//raydium/products/raydiumclmm/logo.png" 
              alt="Raydium" 
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h1 className="text-white text-2xl font-bold">{token.tokenPair}</h1>
              <p className="text-gray-400 text-sm">{token.tokenName}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-white text-2xl font-bold">
              ${formatPrice(stats.currentPrice)}
            </div>
            <div className="text-gray-400 text-sm">
              ${formatPrice(stats.currentPrice)} SOL
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="text-right">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-500">LIVE</span>
            <span className="text-gray-500">({subscriberCount} watching)</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-8">
        {/* Column 1: Volume Stats */}
        <div className="space-y-4">
          <div className="text-gray-500 text-xs uppercase tracking-wider">LIQUIDITY</div>
          <div className="text-white font-bold">{token.liquidity || '$2.4M'}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">FDV</div>
          <div className="text-white font-bold">{token.fdv || '$47.6M'}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">MKT CAP</div>
          <div className="text-white font-bold">$46.5M</div>
        </div>

        {/* Column 2: Time-based Changes */}
        <div className="space-y-4">
          <div className="text-gray-500 text-xs uppercase tracking-wider">5M</div>
          <div className={`font-bold ${getPercentageColor(stats.priceChange5m)}`}>
            {formatPercentage(stats.priceChange5m)}
          </div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">1H</div>
          <div className={`font-bold ${getPercentageColor(stats.priceChange1h)}`}>
            {formatPercentage(stats.priceChange1h)}
          </div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">6H</div>
          <div className={`font-bold ${getPercentageColor(stats.priceChange6h)}`}>
            {formatPercentage(stats.priceChange6h)}
          </div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">24H</div>
          <div className={`font-bold ${getPercentageColor(stats.priceChange24h)}`}>
            {formatPercentage(stats.priceChange24h)}
          </div>
        </div>

        {/* Column 3: Transaction Counts */}
        <div className="space-y-4">
          <div className="text-gray-500 text-xs uppercase tracking-wider">TXNS</div>
          <div className="text-white font-bold">{formatNumber(stats.totalTxns)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">BUYS</div>
          <div className="text-green-500 font-bold">{formatNumber(stats.buys)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">SELLS</div>
          <div className="text-red-500 font-bold">{formatNumber(stats.sells)}</div>
        </div>

        {/* Column 4: Volume Breakdown */}
        <div className="space-y-4">
          <div className="text-gray-500 text-xs uppercase tracking-wider">VOLUME</div>
          <div className="text-white font-bold">{formatVolume(stats.totalVolume)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">BUY VOL</div>
          <div className="text-green-500 font-bold">{formatVolume(stats.buyVolume)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">SELL VOL</div>
          <div className="text-red-500 font-bold">{formatVolume(stats.sellVolume)}</div>
        </div>

        {/* Column 5: User Counts */}
        <div className="space-y-4">
          <div className="text-gray-500 text-xs uppercase tracking-wider">MAKERS</div>
          <div className="text-white font-bold">{formatNumber(stats.makers)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">BUYERS</div>
          <div className="text-green-500 font-bold">{formatNumber(stats.buyers)}</div>
          
          <div className="text-gray-500 text-xs uppercase tracking-wider">SELLERS</div>
          <div className="text-red-500 font-bold">{formatNumber(stats.sellers)}</div>
        </div>
      </div>
    </div>
  );
};