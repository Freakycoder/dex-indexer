'use client';

import React from 'react';
import { 
  Star, Bell, Grid3x3, TrendingUp, Zap,
  Briefcase, Megaphone, Search, Twitter,
  Send, Github, Settings, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeRoute: string;
  setActiveRoute: (route: string) => void;
  onSearchClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeRoute, 
  setActiveRoute,
  onSearchClick 
}) => {
  const menuItems = [
    { icon: Star, label: 'Watchlist', route: 'watchlist' },
    { icon: Bell, label: 'Alerts', route: 'alerts' },
    { icon: Grid3x3, label: 'Multicharts', route: 'multicharts' },
    { icon: Zap, label: 'New Pairs', route: 'new-pairs' },
    { icon: TrendingUp, label: 'Gainers & Losers', route: 'gainers' },
    { icon: Briefcase, label: 'Portfolio', route: 'portfolio' },
    { icon: Megaphone, label: 'Advertise', route: 'advertise' },
  ];

  const chains = [
    { name: 'Moonit', route: 'moonit', color: '#FF6B6B' },
    { name: 'Solana', route: 'solana', color: '#9945FF' },
    { name: 'BSC', route: 'bsc', color: '#F0B90B' },
    { name: 'Ethereum', route: 'ethereum', color: '#627EEA' },
  ];

  return (
    <div className="w-[200px] bg-[#0b0e11] h-screen border-r border-gray-900 flex flex-col">
      <div className="p-4 flex-1">
        {/* Logo */}
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
            <span className="text-black text-xs font-bold">D</span>
          </div>
          <span className="text-white font-bold text-base tracking-wide">DEXSCREENER</span>
        </div>
        
        {/* Search Button */}
        <button 
          onClick={onSearchClick}
          className="w-full bg-[#1a1d21] text-gray-400 px-3 py-2 rounded-lg flex items-center justify-between hover:bg-gray-800 transition-colors mb-4 group"
        >
          <div className="flex items-center">
            <Search className="w-4 h-4 mr-2" />
            <span className="text-sm">Search</span>
          </div>
          <span className="text-xs text-gray-600 font-mono">/</span>
        </button>

        {/* Get App Button */}
        <button className="w-full bg-[#1a1d21] text-white px-3 py-2.5 rounded-lg flex items-center justify-center space-x-2 mb-6 hover:bg-gray-800 transition-colors">
          <span className="text-xs font-medium">Get the App!</span>
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-gray-600 rounded" />
            <div className="w-4 h-4 bg-gray-600 rounded" />
          </div>
        </button>

        {/* Menu Items */}
        <div className="space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.route}
              onClick={() => setActiveRoute(item.route)}
              className={cn(
                "w-full px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors",
                activeRoute === item.route 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        <button className="w-full px-3 py-2 text-gray-500 text-sm text-left hover:text-white transition-colors mt-2 flex items-center">
          more
          <ChevronDown className="w-3 h-3 ml-1" />
        </button>

        {/* Chains */}
        <div className="mt-8 space-y-0.5">
          {chains.map((chain) => (
            <button
              key={chain.route}
              onClick={() => setActiveRoute(chain.route)}
              className={cn(
                "w-full px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors",
                activeRoute === chain.route 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              )}
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: chain.color }}
              >
                {chain.name[0]}
              </div>
              <span className="text-sm">{chain.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-900">
        <div className="mb-4">
          <button className="w-full px-3 py-2 text-gray-400 hover:text-white flex items-center space-x-3 transition-colors">
            <Star className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">WATCHLIST</span>
          </button>
          <div className="mt-2 px-3">
            <select className="bg-transparent text-gray-400 text-sm outline-none w-full cursor-pointer">
              <option>Main Watchlist</option>
            </select>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 px-3 mb-4">
          Nothing in this list yet...
        </div>

        <div className="flex items-center justify-between px-3 mb-4">
          <button className="text-gray-400 hover:text-white">
            <div className="w-5 h-5 bg-gray-700 rounded-full" />
          </button>
          <span className="text-gray-500 text-xs">Sign-in</span>
        </div>

        <div className="flex items-center justify-around px-3">
          <Twitter className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
          <Send className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
          <Github className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
          <Settings className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>
    </div>
  );
};