'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

export const TokenChart: React.FC = () => {
  return (
    <div className="h-80 bg-[#0f1114] flex items-center justify-center border-b border-gray-900">
      <div className="text-center">
        <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-gray-500 text-xl font-medium mb-2">Chart Coming Soon</h3>
        <p className="text-gray-600 text-sm">
          Interactive price chart and technical analysis will be available here
        </p>
      </div>
    </div>
  );
};