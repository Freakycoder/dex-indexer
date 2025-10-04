'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  IChartApi,
  CandlestickData,
  UTCTimestamp,
  HistogramData,
  ISeriesApi,
  LineStyle,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { TransactionData } from '@/context/WebsocketContext';
import { ChartToolbar } from './ChartToolbar';

interface TradingViewChartProps {
  transactions: TransactionData[];
  tokenPair: string;
  height?: number;
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface CandleAggregation {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  buyVolume: number;
  sellVolume: number;
}

interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}

const MAX_CANDLES = 1000;

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ 
  transactions, 
  tokenPair,
  height = 480,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const currentPriceLineRef = useRef<any>(null);
  
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ohlcvData, setOhlcvData] = useState<OHLCVData | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f1114' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { 
          color: '#1a1d21',
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: { 
          color: '#1a1d21',
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
        visible: true,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#374151',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: false,
      },
    });

    // Create candlestick series
    const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 6,
        minMove: 0.000001,
      },
    });

    candlestickSeriesRef.current = candlestickSeriesInstance;

    const volumeSeriesInstance = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeriesInstance.priceScale().applyOptions({
        scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })
    
    volumeSeriesRef.current = volumeSeriesInstance;

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isFullscreen ? window.innerHeight : height,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(entries => {
      if (chartRef.current && entries[0]) {
        const { width } = entries[0].contentRect;
        chartRef.current.applyOptions({ width });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [height, isFullscreen]);

  // Update chart data when transactions change
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || transactions.length === 0) {
      return;
    }

    const { candleData, volumeData } = aggregateTransactions(transactions, timeframe);
    
    if (candleData.length === 0) return;

    const limitedCandleData = candleData.slice(-MAX_CANDLES);
    const limitedVolumeData = volumeData.slice(-MAX_CANDLES);

    // Set data
    candlestickSeriesRef.current.setData(limitedCandleData);
    volumeSeriesRef.current.setData(limitedVolumeData);

    // Calculate OHLCV for display
    if (limitedCandleData.length > 0) {
      const latestCandle = limitedCandleData[limitedCandleData.length - 1];
      const previousCandle = limitedCandleData.length > 1 
        ? limitedCandleData[limitedCandleData.length - 2] 
        : latestCandle;
      
      const change = latestCandle.close - previousCandle.close;
      const changePercent = (change / previousCandle.close) * 100;
      
      const totalVolume = limitedVolumeData.reduce((sum, v) => sum + v.value, 0);

      setOhlcvData({
        open: latestCandle.open,
        high: latestCandle.high,
        low: latestCandle.low,
        close: latestCandle.close,
        volume: totalVolume,
        change: change,
        changePercent: changePercent,
      });

      // Update current price line
      updateCurrentPriceLine(latestCandle.close);
    }

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [transactions, timeframe]);

  // Aggregate transactions into OHLCV candles
  const aggregateTransactions = useCallback((txns: TransactionData[], tf: Timeframe) => {
    if (txns.length === 0) return { candleData: [], volumeData: [] };

    const timeframeMs = getTimeframeMs(tf);
    
    const sortedTxns = [...txns].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const candles = new Map<number, CandleAggregation>();

    sortedTxns.forEach(txn => {
      const timestamp = new Date(txn.date).getTime();
      const candleTime = Math.floor(timestamp / timeframeMs) * timeframeMs;
      const price = txn.token_price || 0;
      const volume = txn.usd_value || 0;
      const isBuy = txn.purchase_type === 'Buy';

      if (!candles.has(candleTime)) {
        candles.set(candleTime, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume,
          buyVolume: isBuy ? volume : 0,
          sellVolume: isBuy ? 0 : volume,
          timestamp: candleTime,
        });
      } else {
        const candle = candles.get(candleTime)!;
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
        candle.volume += volume;
        
        if (isBuy) {
          candle.buyVolume += volume;
        } else {
          candle.sellVolume += volume;
        }
      }
    });

    const candleArray = Array.from(candles.values()).sort((a, b) => a.timestamp - b.timestamp);
    
    const candleData: CandlestickData[] = candleArray.map(candle => ({
      time: (candle.timestamp / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData: HistogramData[] = candleArray.map(candle => ({
      time: (candle.timestamp / 1000) as UTCTimestamp,
      value: candle.volume,
      color: candle.buyVolume > candle.sellVolume ? '#22c55e80' : '#ef444480',
    }));

    return { candleData, volumeData };
  }, []);

  // Update current price line
  const updateCurrentPriceLine = (price: number) => {
    if (!candlestickSeriesRef.current) return;

    if (currentPriceLineRef.current) {
      candlestickSeriesRef.current.removePriceLine(currentPriceLineRef.current);
    }

    currentPriceLineRef.current = candlestickSeriesRef.current.createPriceLine({
      price: price,
      color: '#9ca3af',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: '',
    });
  };

  const getTimeframeMs = (tf: Timeframe): number => {
    switch (tf) {
      case '1m': return 60 * 1000;
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  };

  const formatPrice = (price: number): string => {
    if (price < 0.00001) return price.toExponential(2);
    if (price < 0.001) return price.toFixed(7);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(0);
  };

  const handleFullscreen = () => {
    if (!isFullscreen) {
      chartContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      className="relative w-full bg-[#0f1114]" 
      style={{ height: `${height}px` }}
    >
      {/* OHLCV Display - Top Left */}
      {ohlcvData && (
        <div className="absolute top-2 left-2 z-10 text-xs font-mono space-y-0.5">
          <div className="flex items-center space-x-3">
            <span className="text-gray-500">O</span>
            <span className="text-white">{formatPrice(ohlcvData.open)}</span>
            <span className="text-gray-500">H</span>
            <span className="text-white">{formatPrice(ohlcvData.high)}</span>
            <span className="text-gray-500">L</span>
            <span className="text-white">{formatPrice(ohlcvData.low)}</span>
            <span className="text-gray-500">C</span>
            <span className="text-white">{formatPrice(ohlcvData.close)}</span>
            <span className={ohlcvData.change >= 0 ? 'text-green-500' : 'text-red-500'}>
              {ohlcvData.change >= 0 ? '+' : ''}{formatPrice(ohlcvData.change)} ({ohlcvData.changePercent >= 0 ? '+' : ''}{ohlcvData.changePercent.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">Volume</span>
            <span className="text-white">{formatVolume(ohlcvData.volume)}</span>
          </div>
        </div>
      )}

      {/* Chart Toolbar - Top Right */}
      <ChartToolbar
        onFullscreenClick={handleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Timeframe Selector - Bottom */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center space-x-1">
        {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              timeframe === tf
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {transactions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1114]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-500 text-sm font-medium">Loading chart data...</div>
            <div className="text-gray-600 text-xs mt-1">
              Waiting for {tokenPair} transactions
            </div>
          </div>
        </div>
      )}
    </div>
  );
};