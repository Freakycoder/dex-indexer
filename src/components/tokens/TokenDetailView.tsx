"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  ExternalLink,
  Globe,
  Twitter,
  Send,
  Copy,
  ChevronLeft,
  Star,
  MoreHorizontal,
} from "lucide-react";
import { Token } from "@/data/DataTypes";
import { TokenTransactionTable } from "./TokenTransactionTable";
import { TradingViewChart } from "../charts/TradingViewChart";
import { useWebSocketRoom } from "@/hooks/useWebsocket";
import { formatPrice, formatPercentage, getPercentageColor } from "@/lib/utils";

interface TokenDetailViewProps {
  token: Token;
  onClose: () => void;
}

export const TokenDetailView: React.FC<TokenDetailViewProps> = ({
  token,
  onClose,
}) => {
  const {
    transactions,
    metrics,
    connectionStatus,
    isSubscribed,
    subscriberCount,
  } = useWebSocketRoom(token.tokenPair, true);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    if (!metrics) {
      return {
        txns: 0,
        buys: 0,
        sells: 0,
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
        makers: 0,
        buyers: 0,
        sellers: 0,
      };
    }

    const stats = metrics["24h"]?.stats || {
      txns: 0,
      buys: 0,
      sells: 0,
      volume: 0,
      buy_volume: 0,
      sell_volume: 0,
      makers: 0,
      buyers: 0,
      sellers: 0,
    };

    return {
      txns: stats.txns,
      buys: stats.buys,
      sells: stats.sells,
      volume: stats.volume,
      buyVolume: stats.buy_volume,
      sellVolume: stats.sell_volume,
      makers: stats.makers,
      buyers: stats.buyers,
      sellers: stats.sellers,
    };
  }, [metrics]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatCount = (count: number): string => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Loading state
  if (connectionStatus !== "connected" || !isSubscribed) {
    return (
      <div className="flex-1 flex flex-col bg-[#0b0e11]">
        <div className="border-b border-gray-900 px-4 py-2 flex items-center justify-between">
          <div className="text-gray-400">
            Connecting to {token.tokenPair}...
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-500 text-lg mb-2">
              Establishing connection...
            </div>
            <div className="text-gray-600 text-sm">
              Status:{" "}
              <span className="text-yellow-500">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0b0e11] overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="border-b border-gray-900 bg-[#0b0e11] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <img
              src={token.chain}
              alt="Chain"
              className="w-5 h-5 rounded-full"
            />
            <span className="text-white font-medium">{token.tokenPair}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400 text-sm">{token.dexName}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 text-sm">Price</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-400 text-sm">MCap</span>
          <button className="text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded text-sm">
            USD / SOL
          </button>
          <button className="text-gray-400 hover:text-white">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart Area (Left) */}
        <div className="flex-1 overflow-hidden">
          <TradingViewChart
            transactions={transactions}
            tokenPair={token.tokenPair}
            height={480}
          />
        </div>

        {/* Metrics Panel (Right) */}
        <div className="w-[400px] bg-[#0b0e11] border-l border-gray-900 flex flex-col overflow-y-auto scrollbar-thin">
          {/* Token Header */}
          <div className="p-4 border-b border-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <img
                  src={token.chain}
                  alt="Chain"
                  className="w-6 h-6 rounded-full"
                />
                <img
                  src={
                    token.dexName === "Raydium"
                      ? "https://static1.tokenterminal.com//raydium/products/raydiumclmm/logo.png"
                      : token.dexName === "Meteora"
                      ? "https://docs.meteora.ag/images/logo/meteora.png"
                      : "https://via.placeholder.com/24"
                  }
                  alt={token.dexName}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-white font-bold text-lg">
                  {token.tokenSymbol}
                </span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-400">SOL</span>
                <span className="text-xs bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                  {token.dexTag}
                </span>
              </div>
              <button className="text-gray-400 hover:text-white">
                <Star className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-3">
              <div className="text-white font-medium mb-1">
                {token.tokenName}
              </div>
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs">
                  <Globe className="w-3 h-3" />
                  <span>Website</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs">
                  <Twitter className="w-3 h-3" />
                  <span>Twitter</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs">
                  <Send className="w-3 h-3" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">PRICE USD</div>
                <div className="text-white text-lg font-bold">
                  $
                  {metrics?.currentPriceUSD?.toFixed(5) ||
                    token.price.toFixed(5)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">PRICE SOL</div>
                <div className="text-white text-lg font-bold">
                  {(metrics?.currentPriceSOL
                    ? metrics.currentPriceSOL / 100
                    : token.price / 100
                  ).toFixed(7)}{" "}
                  SOL
                </div>
              </div>
            </div>
          </div>

          {/* Market Data */}
          <div className="p-4 border-b border-gray-900">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">LIQUIDITY</div>
                <div className="text-white font-bold text-sm">
                  {token.liquidity || "$0"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">FDV</div>
                <div className="text-white font-bold text-sm">
                  {token.fdv || "$0"}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">MKT CAP</div>
                <div className="text-white font-bold text-sm">
                  {token.fdv || "$0"}
                </div>
              </div>
            </div>
          </div>

          {/* Timeframe Changes */}
          <div className="p-4 border-b border-gray-900">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">5M</div>
                <div
                  className={`font-bold text-sm ${getPercentageColor(
                    metrics?.["5m"]?.price_change || 0
                  )}`}
                >
                  {formatPercentage(metrics?.["5m"]?.price_change || 0)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">1H</div>
                <div
                  className={`font-bold text-sm ${getPercentageColor(
                    metrics?.["1h"]?.price_change || 0
                  )}`}
                >
                  {formatPercentage(metrics?.["1h"]?.price_change || 0)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">6H</div>
                <div
                  className={`font-bold text-sm ${getPercentageColor(
                    metrics?.["6h"]?.price_change || 0
                  )}`}
                >
                  {formatPercentage(metrics?.["6h"]?.price_change || 0)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">24H</div>
                <div
                  className={`font-bold text-sm ${getPercentageColor(
                    metrics?.["24h"]?.price_change || 0
                  )}`}
                >
                  {formatPercentage(metrics?.["24h"]?.price_change || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Stats */}
          <div className="p-4 border-b border-gray-900">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">TXNS</div>
                <div className="text-white font-bold text-sm">
                  {formatCount(aggregatedStats.txns)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">BUYS</div>
                <div className="text-green-500 font-bold text-sm">
                  {formatCount(aggregatedStats.buys)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">SELLS</div>
                <div className="text-red-500 font-bold text-sm">
                  {formatCount(aggregatedStats.sells)}
                </div>
              </div>
            </div>
          </div>

          {/* Volume Stats */}
          <div className="p-4 border-b border-gray-900">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">VOLUME</div>
                <div className="text-white font-bold text-sm">
                  {formatVolume(aggregatedStats.volume)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">BUY VOL</div>
                <div className="text-green-500 font-bold text-sm">
                  {formatVolume(aggregatedStats.buyVolume)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">SELL VOL</div>
                <div className="text-red-500 font-bold text-sm">
                  {formatVolume(aggregatedStats.sellVolume)}
                </div>
              </div>
            </div>
          </div>

          {/* Maker Stats */}
          <div className="p-4 border-b border-gray-900">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-500 text-xs mb-1">MAKERS</div>
                <div className="text-white font-bold text-sm">
                  {formatCount(aggregatedStats.makers)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">BUYERS</div>
                <div className="text-green-500 font-bold text-sm">
                  {formatCount(aggregatedStats.buyers)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">SELLERS</div>
                <div className="text-red-500 font-bold text-sm">
                  {formatCount(aggregatedStats.sellers)}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">BUYS / SELLS</span>
                  <span className="text-gray-400">
                    {aggregatedStats.buys} / {aggregatedStats.sells}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-red-500"
                    style={{
                      width: `${
                        (aggregatedStats.buys /
                          Math.max(aggregatedStats.txns, 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">BUYERS</span>
                  <span className="text-gray-400">
                    {aggregatedStats.buyers}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${
                        (aggregatedStats.buyers /
                          Math.max(aggregatedStats.makers, 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">SELLERS</span>
                  <span className="text-gray-400">
                    {aggregatedStats.sellers}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${
                        (aggregatedStats.sellers /
                          Math.max(aggregatedStats.makers, 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 mt-auto border-t border-gray-900">
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                Buy
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors">
                Sell
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="h-[300px] border-t border-gray-900 overflow-hidden">
        <TokenTransactionTable
          tokenPair={token.tokenPair}
          transactions={transactions}
        />
      </div>
    </div>
  );
};
