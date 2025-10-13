"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  UTCTimestamp,
  ISeriesApi,
  LineStyle,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import {
  TransactionData,
  useGlobalWebSocket,
  CandleData,
} from "@/context/WebsocketContext";
import { ChartToolbar } from "./ChartToolbar";

interface TradingViewChartProps {
  transactions: TransactionData[];
  tokenPair: string;
  height?: number;
}

type Timeframe = "1s" | "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

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
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const currentPriceLineRef = useRef<any>(null);
  
  // Track last candle timestamp to detect updates vs new candles
  const lastCandleTimestampRef = useRef<Map<string, number>>(new Map());
  const isInitializedRef = useRef<Map<string, boolean>>(new Map());

  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ohlcvData, setOhlcvData] = useState<OHLCVData | null>(null);
  const { getRoomCandles } = useGlobalWebSocket();

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f1114" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: {
          color: "#1a1d21",
          style: LineStyle.Solid,
          visible: true,
        },
        horzLines: {
          color: "#1a1d21",
          style: LineStyle.Solid,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        borderColor: "#2a2e39",
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
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#6b7280",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#374151",
        },
        horzLine: {
          color: "#6b7280",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#374151",
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

    const candlestickSeriesInstance = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
    });

    candlestickSeriesRef.current = candlestickSeriesInstance;

    const volumeSeriesInstance = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
    });

    volumeSeriesInstance.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

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

    window.addEventListener("resize", handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current && entries[0]) {
        const { width } = entries[0].contentRect;
        chartRef.current.applyOptions({ width });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [height, isFullscreen]);

  // Handle candle updates
  useEffect(() => {
    if (
      !chartRef.current ||
      !candlestickSeriesRef.current ||
      !volumeSeriesRef.current
    )
      return;

    const candles = getRoomCandles(tokenPair, timeframe);
    
    if (!candles || candles.length === 0) {
      console.log(`📊 No candles available for ${tokenPair} ${timeframe}`);
      return;
    }

    const key = `${tokenPair}-${timeframe}`;
    const isInitialized = isInitializedRef.current.get(key);
    const lastTimestamp = lastCandleTimestampRef.current.get(key);

    // Sort candles by timestamp
    const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);

    if (!isInitialized || !lastTimestamp) {
      // Initial load - use setData
      console.log(`📊 Initial load: ${sortedCandles.length} candles for ${tokenPair} ${timeframe}`);
      
      const formattedCandles = sortedCandles
        .filter((c) => c && c.timestamp && c.close != null)
        .map((c) => ({
          time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

      const formattedVolume = sortedCandles.map((c) => ({
        time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
        value: c.volume ?? 0,
        color: (c.buy_volume ?? 0) > (c.sell_volume ?? 0) ? "#22c55e80" : "#ef444480",
      }));

      if (formattedCandles.length > 0) {
        candlestickSeriesRef.current.setData(formattedCandles);
        volumeSeriesRef.current.setData(formattedVolume);
        
        isInitializedRef.current.set(key, true);
        lastCandleTimestampRef.current.set(key, sortedCandles[sortedCandles.length - 1].timestamp);
        
        const latest = formattedCandles[formattedCandles.length - 1];
        const prev = formattedCandles[formattedCandles.length - 2];
        
        updateOHLCVDisplay(latest, prev, formattedVolume);
        updateCurrentPriceLine(latest.close);
        chartRef.current.timeScale().fitContent();
      }
    } else {
      // Live update - use update() for last candle or new candles
      const latestCandle = sortedCandles[sortedCandles.length - 1];
      
      if (latestCandle.timestamp === lastTimestamp) {
        // Update existing candle
        console.log(`🔄 Updating candle for ${tokenPair} ${timeframe} at ${latestCandle.timestamp}`);
        
        const formattedCandle = {
          time: Math.floor(latestCandle.timestamp / 1000) as UTCTimestamp,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
        };

        const formattedVolume = {
          time: Math.floor(latestCandle.timestamp / 1000) as UTCTimestamp,
          value: latestCandle.volume ?? 0,
          color: (latestCandle.buy_volume ?? 0) > (latestCandle.sell_volume ?? 0) 
            ? "#22c55e80" 
            : "#ef444480",
        };

        candlestickSeriesRef.current.update(formattedCandle);
        volumeSeriesRef.current.update(formattedVolume);
        
        // Get previous candle for comparison
        const prevCandle = sortedCandles[sortedCandles.length - 2];
        const prevFormatted = prevCandle ? {
          time: Math.floor(prevCandle.timestamp / 1000) as UTCTimestamp,
          open: prevCandle.open,
          high: prevCandle.high,
          low: prevCandle.low,
          close: prevCandle.close,
        } : undefined;
        
        updateOHLCVDisplay(formattedCandle, prevFormatted, [formattedVolume]);
        updateCurrentPriceLine(formattedCandle.close);
      } else if (latestCandle.timestamp > lastTimestamp) {
        // New candle(s) - append them
        console.log(`✨ New candle(s) for ${tokenPair} ${timeframe}`);
        
        // Get all candles after last timestamp
        const newCandles = sortedCandles.filter(c => c.timestamp > lastTimestamp);
        
        newCandles.forEach(candle => {
          const formattedCandle = {
            time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };

          const formattedVolume = {
            time: Math.floor(candle.timestamp / 1000) as UTCTimestamp,
            value: candle.volume ?? 0,
            color: (candle.buy_volume ?? 0) > (candle.sell_volume ?? 0) 
              ? "#22c55e80" 
              : "#ef444480",
          };

          candlestickSeriesRef.current!.update(formattedCandle);
          volumeSeriesRef.current!.update(formattedVolume);
        });
        
        lastCandleTimestampRef.current.set(key, latestCandle.timestamp);
        
        const formattedLatest = {
          time: Math.floor(latestCandle.timestamp / 1000) as UTCTimestamp,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
        };
        
        const prevCandle = sortedCandles[sortedCandles.length - 2];
        const prevFormatted = prevCandle ? {
          time: Math.floor(prevCandle.timestamp / 1000) as UTCTimestamp,
          open: prevCandle.open,
          high: prevCandle.high,
          low: prevCandle.low,
          close: prevCandle.close,
        } : undefined;
        
        updateOHLCVDisplay(formattedLatest, prevFormatted, [{
          time: formattedLatest.time,
          value: latestCandle.volume ?? 0,
          color: (latestCandle.buy_volume ?? 0) > (latestCandle.sell_volume ?? 0) 
            ? "#22c55e80" 
            : "#ef444480",
        }]);
        updateCurrentPriceLine(formattedLatest.close);
      }
    }
  }, [tokenPair, timeframe, getRoomCandles]);

  // Reset initialization when timeframe changes
  useEffect(() => {
    const key = `${tokenPair}-${timeframe}`;
    isInitializedRef.current.set(key, false);
    lastCandleTimestampRef.current.delete(key);
  }, [timeframe, tokenPair]);

  const updateOHLCVDisplay = (
    latest: any,
    prev: any | undefined,
    volumeData: any[]
  ) => {
    if (!latest) return;

    const change = prev ? latest.close - prev.close : 0;
    const changePercent = prev ? (change / prev.close) * 100 : 0;
    const totalVolume = volumeData.reduce((sum, v) => sum + v.value, 0);

    setOhlcvData({
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      volume: totalVolume,
      change,
      changePercent,
    });
  };

  const updateCurrentPriceLine = (price: number) => {
    if (!candlestickSeriesRef.current) return;

    if (currentPriceLineRef.current) {
      candlestickSeriesRef.current.removePriceLine(currentPriceLineRef.current);
    }

    currentPriceLineRef.current = candlestickSeriesRef.current.createPriceLine({
      price: price,
      color: "#9ca3af",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "",
    });
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

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
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
            <span
              className={
                ohlcvData.change >= 0 ? "text-green-500" : "text-red-500"
              }
            >
              {ohlcvData.change >= 0 ? "+" : ""}
              {formatPrice(ohlcvData.change)} (
              {ohlcvData.changePercent >= 0 ? "+" : ""}
              {ohlcvData.changePercent.toFixed(2)}%)
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
        {(["1s", "1m", "5m", "1h", "4h", "1d", "1w"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              timeframe === tf
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
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
            <div className="text-gray-500 text-sm font-medium">
              Loading chart data...
            </div>
            <div className="text-gray-600 text-xs mt-1">
              Waiting for {tokenPair} candles
            </div>
          </div>
        </div>
      )}
    </div>
  );
};