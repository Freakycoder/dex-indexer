'use client';

import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ChartToolbarProps {
  onFullscreenClick: () => void;
  isFullscreen?: boolean;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  onFullscreenClick,
  isFullscreen = false,
}) => {
  return (
    <div className="absolute top-2 right-2 z-10">
      <button
        onClick={onFullscreenClick}
        className="p-1.5 text-gray-400 rounded hover:bg-gray-800 hover:text-white transition-colors"
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="w-4 h-4" />
        ) : (
          <Maximize2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};