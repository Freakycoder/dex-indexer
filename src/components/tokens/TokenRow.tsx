"use client";

import React from "react";
import { Token } from "@/data/DataTypes";
import { Zap, TrendingUp, TrendingDown } from "lucide-react";
import { SparklineChart } from "./SparklineChart";
import {
  formatPercentage,
  getPercentageColor,
  formatPrice,
  formatNumber,
} from "@/lib/utils";

interface TokenRowProps {
  token: Token;
  index: number;
  onTokenClick: (token: Token) => void;
}

export const TokenRow: React.FC<TokenRowProps> = ({
  token,
  index,
  onTokenClick,
}) => {
  // Pulse animation for new transactions
  const pulseStyle = {
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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

  const handleClick = () => {
    onTokenClick(token);
  };

  console.log('🔍 TokenRow render - dexTag:', token.dexTag, 'dexName:', token.dexName, 'tokenSymbol:', token.tokenSymbol);

  return (
    <>
      <style>{keyframes}</style>
      <tr
        className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors cursor-pointer group"
        onClick={handleClick}
      >
        <td className="px-3 py-3 text-gray-500 text-xs">#{index + 1}</td>

        <td className="px-3 py-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
            <img
              className="w-6 h-6 rounded-full "
              src={token.chain}
              alt="Solana Logo"
            />
              <img
                src={
                  token.dexName === "Raydium"
                    ? "https://static1.tokenterminal.com//raydium/products/raydiumclmm/logo.png"
                    : token.dexName === "Meteora"
                    ? "https://docs.meteora.ag/images/logo/meteora.png"
                    : "https://via.placeholder.com/24" // fallback
                }
                alt={token.dexName}
                className="w-6 h-6 rounded-full flex-shrink-0"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="text-blue-300 text-xs border border-blue-900 px-1 py-0.5 rounded text-white bg-transparent">
                  {token.dexTag || 'Unknown'}
                </span>
                <span className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors">
                  {token.tokenSymbol}
                </span>
                <span className="text-gray-500 text-xs">
                  / {token.tokenPair?.split("/")[1] || "SOL"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 text-xs truncate max-w-[120px]">
                  {token.tokenName}
                </span>
                {token.priceChange && (
                  <span className="text-yellow-500 flex items-center text-xs">
                    <Zap className="w-3 h-3" />
                    {token.priceChange}
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="px-3 py-3">
          <div className="text-white text-sm">${formatPrice(token.price)}</div>
          {token.fdv && (
            <div className="text-gray-500 text-xs">{token.fdv}</div>
          )}
        </td>

        <td className="px-3 py-3 text-gray-400 text-sm">{token.age}</td>

        <td className="px-3 py-3 text-gray-400 text-sm">
          {formatNumber(token.txns)}
        </td>

        <td className="px-3 py-3 text-gray-400 text-sm">
          {token.volumeFormatted}
        </td>

        <td className="px-3 py-3 text-gray-400 text-sm">
          {formatNumber(token.makers)}
        </td>

        <td
          className={`px-3 py-3 text-sm ${getPercentageColor(token.change5m)}`}
        >
          {formatPercentage(token.change5m)}
        </td>

        <td
          className={`px-3 py-3 text-sm ${getPercentageColor(token.change1h)}`}
        >
          {formatPercentage(token.change1h)}
        </td>

        <td
          className={`px-3 py-3 text-sm ${getPercentageColor(token.change6h)}`}
        >
          {formatPercentage(token.change6h)}
        </td>

        <td
          className={`px-3 py-3 text-sm ${getPercentageColor(token.change24h)}`}
        >
          {formatPercentage(token.change24h)}
        </td>

        <td className="px-3 py-3 text-gray-400 text-sm">{token.liquidity}</td>

        <td className="px-3 py-3">
          <SparklineChart
            data={token.sparklineData}
            isPositive={token.isPositive}
          />
        </td>
      </tr>
    </>
  );
};
