'use client';

import React from 'react';
import { 
  Clock, TrendingUp, Zap, Star, Users, 
  DollarSign, ChevronDown, Filter, Flame,
  BarChart3, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  timeFilter: string;
  setTimeFilter: (filter: string) => void;
  trendingFilter: boolean;
  setTrendingFilter: (filter: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  timeFilter,
  setTimeFilter,
  trendingFilter,
  setTrendingFilter
}) => {
  return (
    <div className="border-b border-gray-900 px-6 py-3 bg-[#0b0e11]">
      <div className="flex items-center space-x-2">
        {/* Time Filter */}
        <button
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center",
            timeFilter === '24h' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          )}
          onClick={() => setTimeFilter('24h')}
        >
          <Clock className="w-3 h-3 mr-1.5" />
          Last 24 hours
          <ChevronDown className="w-3 h-3 ml-1.5" />
        </button>
        
        {/* Trending Filter */}
        <button
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center",
            trendingFilter 
              ? 'bg-gray-800 text-white' 
              : 'bg-gray-900 text-gray-400'
          )}
          onClick={() => setTrendingFilter(!trendingFilter)}
        >
          <Flame className="w-3 h-3 mr-1.5" />
          Trending 
          <span className="bg-gray-700 px-1.5 py-0.5 rounded text-xs ml-2">0</span>
        </button>

        {/* Time Intervals */}
        <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 font-medium">
          5M
        </button>
        <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 font-medium">
          1H
        </button>
        <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 font-medium">
          6H
        </button>
        <button className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 font-medium">
          24H
        </button>

        <div className="flex-1" />

        {/* Right Side Buttons */}
        <button className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 flex items-center">
          <BarChart3 className="w-3 h-3 mr-1.5" />
          Top
        </button>
        <button className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 flex items-center">
          <TrendingUp className="w-3 h-3 mr-1.5" />
          Gainers
        </button>
        <button className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 flex items-center">
          <Sparkles className="w-3 h-3 mr-1.5" />
          New Pairs
        </button>

        {/* Icon Buttons */}
        <div className="flex space-x-1.5 ml-3 border-l border-gray-800 pl-3">
          <button className="p-1.5 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors">
            <Users className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-gray-800 text-yellow-500 rounded hover:bg-gray-700 transition-colors">
            <Zap className="w-4 h-4" />
          </button>
          <button className="p-1.5 bg-gray-800 text-green-500 rounded hover:bg-gray-700 transition-colors">
            <DollarSign className="w-4 h-4" />
          </button>
        </div>

        {/* Rank By */}
        <button className="px-4 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm hover:bg-gray-700 flex items-center ml-3">
          <span className="text-gray-500">Rank by:</span>
          <ChevronDown className="w-3 h-3 mx-1" />
          <span>Trending 6H</span>
        </button>

        {/* Filter Button */}
        <button className="p-1.5 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors">
          <Filter className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};