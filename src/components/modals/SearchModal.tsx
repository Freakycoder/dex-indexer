'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Token } from '@/data/DataTypes';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens?: Token[];
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, tokens = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter tokens based on search
  const filteredTokens = tokens.filter(token => 
    token.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.tokenSymbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.tokenPair?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
      <div className="relative w-[600px] max-h-[600px] bg-[#1a1d21] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center p-4 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by token name, symbol, or pair..."
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
        
        <div className="p-4 max-h-[500px] overflow-y-auto">
          {searchQuery && filteredTokens.length > 0 ? (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs uppercase mb-2">
                {filteredTokens.length} Results
              </p>
              {filteredTokens.slice(0, 10).map((token) => (
                <div 
                  key={token.id}
                  className="p-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-8 h-8 rounded-full bg-gray-700"
                        style={{ backgroundColor: token.chainColor + '20' }}
                      />
                      <div>
                        <p className="text-white text-sm font-medium">
                          {token.token} <span className="text-gray-500">({token.tokenSymbol})</span>
                        </p>
                        <p className="text-gray-500 text-xs">{token.tokenPair}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">${token.price.toFixed(6)}</p>
                      <p className="text-gray-500 text-xs">{token.volumeFormatted}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <p className="text-gray-500 text-sm">No tokens found for "{searchQuery}"</p>
          ) : (
            <div>
              <p className="text-gray-500 text-sm mb-4">
                Start typing to search for tokens...
              </p>
              {tokens.length > 0 && (
                <div>
                  <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">
                    Recent Tokens
                  </p>
                  <div className="space-y-1">
                    {tokens.slice(0, 5).map((token) => (
                      <div 
                        key={token.id}
                        className="p-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors"
                      >
                        <p className="text-gray-400 text-sm">
                          {token.token} <span className="text-gray-600">({token.tokenPair})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};