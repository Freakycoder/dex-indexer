'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative w-[600px] bg-[#1a1d21] border border-gray-800 rounded-xl shadow-2xl">
        <div className="flex items-center p-4 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token name, symbol, or address..."
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500 text-sm"
            autoFocus
          />
          <button 
            onClick={onClose} 
            className="ml-3 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-gray-500 text-sm">
            Try searching for "MOCHI", "SOL", or any token address
          </p>
          <div className="mt-4 space-y-2">
            {searchQuery && (
              <div className="p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors">
                <p className="text-white text-sm">Search for "{searchQuery}"</p>
              </div>
            )}
          </div>
          
          {!searchQuery && (
            <div className="mt-4 space-y-2">
              <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">Recent Searches</p>
              <div className="space-y-1">
                <div className="p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors">
                  <p className="text-gray-400 text-sm">BONK</p>
                </div>
                <div className="p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors">
                  <p className="text-gray-400 text-sm">WIF</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};