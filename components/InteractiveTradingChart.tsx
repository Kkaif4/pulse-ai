"use client";

import React, { useState } from "react";
import { Trade, V3VersionTrade } from "../types";
import { useChartZoomPan } from "../hooks/useChartZoomPan";
import { getSignalTheme, formatTime } from "../lib/trade-utils";
import { MaximizeIcon, MinimizeIcon } from "./common/Icons";

export function InteractiveTradingChart({ trades }: { trades: (Trade | V3VersionTrade)[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showSpot, setShowSpot] = useState<boolean>(true);
  const [showPcr, setShowPcr] = useState<boolean>(true);

  const padding = { top: 20, right: 45, bottom: 35, left: 55 };
  const {
    zoomRange,
    startIndex,
    endIndex,
    chartWidth,
    isDragging,
    isFullscreen,
    toggleFullscreen,
    svgRef,
    wrapperRef,
    scrollContainerRef,
    handleMouseDown,
    handleMouseMoveForPan,
    handleMouseUp,
    calculateHoverIndex,
    handleResetZoom,
    handleSliderChange,
  } = useChartZoomPan({ dataLength: trades.length, padding });

  const isZoomed = zoomRange.start > 0 || zoomRange.end < 1;
  const visibleTrades = trades.slice(startIndex, endIndex + 1);
  const height = 300;

  if (trades.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs py-12">
        No data points logged. Waiting for live feed...
      </div>
    );
  }

  const spotPrices = visibleTrades.map((t) => Number(t.spotPrice));
  const pcrs = visibleTrades.map((t) => Number(t.pcr));

  const minSpot = Math.min(...spotPrices);
  const maxSpot = Math.max(...spotPrices);
  const spotRange = maxSpot - minSpot || 10;
  const yMinSpot = minSpot - spotRange * 0.1;
  const yMaxSpot = maxSpot + spotRange * 0.1;

  const minPcr = Math.min(...pcrs);
  const maxPcr = Math.max(...pcrs);
  const pcrRange = maxPcr - minPcr || 0.5;
  const yMinPcr = Math.max(0, minPcr - pcrRange * 0.1);
  const yMaxPcr = maxPcr + pcrRange * 0.1;

  const getX = (index: number) => {
    if (endIndex <= startIndex) return padding.left;
    const relativeIndex = index - startIndex;
    const totalVisible = endIndex - startIndex;
    return padding.left + (relativeIndex / totalVisible) * (chartWidth - padding.left - padding.right);
  };

  const getYSpot = (val: number) => {
    return height - padding.bottom - ((val - yMinSpot) / (yMaxSpot - yMinSpot)) * (height - padding.top - padding.bottom);
  };

  const getYPcr = (val: number) => {
    return height - padding.bottom - ((val - yMinPcr) / (yMaxPcr - yMinPcr)) * (height - padding.top - padding.bottom);
  };

  let spotPath = "";
  let pcrPath = "";

  visibleTrades.forEach((t, i) => {
    const absoluteIndex = startIndex + i;
    const x = getX(absoluteIndex);
    const ySpot = getYSpot(Number(t.spotPrice));
    const yPcr = getYPcr(Number(t.pcr));

    if (i === 0) {
      spotPath = `M ${x} ${ySpot}`;
      pcrPath = `M ${x} ${yPcr}`;
    } else {
      spotPath += ` L ${x} ${ySpot}`;
      pcrPath += ` L ${x} ${yPcr}`;
    }
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    handleMouseMoveForPan(e.clientX);
    const index = calculateHoverIndex(e.clientX);
    if (index !== null) {
      setHoveredIndex(index);
      if (wrapperRef.current) {
        const wrapRect = wrapperRef.current.getBoundingClientRect();
        let posX = e.clientX - wrapRect.left + 15;
        let posY = e.clientY - wrapRect.top - 80;
        if (posX + 180 > wrapRect.width) posX = e.clientX - wrapRect.left - 190;
        if (posY < 10) posY = e.clientY - wrapRect.top + 20;
        setTooltipPos({ x: Math.max(10, posX), y: Math.max(10, posY) });
      }
    }
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredIndex(null);
    setTooltipPos(null);
  };

  const hoveredTrade = hoveredIndex !== null ? trades[hoveredIndex] : null;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col select-none transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950 p-6 flex flex-col justify-between"
          : "relative w-full h-full"
      }`}
    >
      {/* Chart Toolbar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-mono text-[11px]">Zoom:</span>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.01"
            value={1 - (zoomRange.end - zoomRange.start)}
            onChange={handleSliderChange}
            className="h-1.5 w-24 sm:w-32 rounded-lg bg-zinc-800 accent-sky-500 cursor-pointer"
            title="Slide or scroll with mouse-wheel inside chart to zoom"
          />
          {isZoomed && (
            <button
              onClick={handleResetZoom}
              className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
            >
              Reset Zoom
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSpot(!showSpot)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
              showSpot
                ? "bg-sky-500/10 border-sky-500 text-sky-400 font-medium"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showSpot ? "bg-sky-400" : "bg-zinc-600"}`} />
            Spot Price
          </button>
          <button
            onClick={() => setShowPcr(!showPcr)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors ${
              showPcr
                ? "bg-orange-500/10 border-orange-500 text-orange-400 font-medium"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showPcr ? "bg-orange-400" : "bg-zinc-600"}`} />
            PCR Trend
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors text-xs font-medium"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <MinimizeIcon className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <MaximizeIcon className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={`relative flex-1 ${
          isFullscreen
            ? "overflow-hidden bg-zinc-950/40 p-2"
            : "overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
        }`}
      >
        <svg
          ref={svgRef}
          width={isFullscreen ? "100%" : chartWidth}
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
          className={`${isFullscreen ? "w-full h-full" : "h-full max-w-none"} select-none ${
            isZoomed ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
          }`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        >
          {/* Horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padding.top + p * (height - padding.top - padding.bottom);
            const spotVal = yMaxSpot - p * (yMaxSpot - yMinSpot);
            const pcrVal = yMaxPcr - p * (yMaxPcr - yMinPcr);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#3f3f46" strokeDasharray="3,3" className="opacity-20" />
                {showSpot && (
                  <text x={padding.left - 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="end" className="font-mono opacity-90">
                    {Math.round(spotVal)}
                  </text>
                )}
                {showPcr && (
                  <text x={chartWidth - padding.right + 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="start" className="font-mono opacity-90">
                    {pcrVal.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Spot Price Line */}
          {showSpot && (
            <path d={spotPath} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* PCR Line */}
          {showPcr && (
            <path d={pcrPath} fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Signal Markers */}
          {showSpot && visibleTrades.map((t, i) => {
            const absoluteIndex = startIndex + i;
            const x = getX(absoluteIndex);
            const y = getYSpot(Number(t.spotPrice));
            if (t.signal && (t.signal.includes("BUY CE") || t.signal.includes("HOLD CE"))) {
              return (
                <polygon
                  key={absoluteIndex}
                  points={`${x},${y - 6} ${x - 5},${y + 3} ${x + 5},${y + 3}`}
                  fill="#10b981"
                />
              );
            } else if (t.signal && (t.signal.includes("BUY PE") || t.signal.includes("HOLD PE"))) {
              return (
                <polygon
                  key={absoluteIndex}
                  points={`${x},${y + 6} ${x - 5},${y - 3} ${x + 5},${y - 3}`}
                  fill="#f43f5e"
                />
              );
            } else if (t.signal && t.signal.includes("EXIT")) {
              return <circle key={absoluteIndex} cx={x} cy={y} r={4} fill="#a855f7" />;
            }
            return null;
          })}

          {/* Hover crosshairs & dots */}
          {hoveredIndex !== null && hoveredTrade && (
            <g>
              <line
                x1={getX(hoveredIndex)}
                y1={padding.top}
                x2={getX(hoveredIndex)}
                y2={height - padding.bottom}
                stroke="#52525b"
                strokeDasharray="2,2"
              />
              {showSpot && (
                <circle cx={getX(hoveredIndex)} cy={getYSpot(Number(hoveredTrade.spotPrice))} r={5} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
              )}
              {showPcr && (
                <circle cx={getX(hoveredIndex)} cy={getYPcr(Number(hoveredTrade.pcr))} r={4} fill="#f97316" stroke="#fff" strokeWidth={1} />
              )}
            </g>
          )}
        </svg>

        {/* Tooltip Overlay */}
        {tooltipPos && hoveredTrade && (
          <div
            className="absolute z-50 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md pointer-events-none text-xs font-sans min-w-[170px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="text-zinc-500 font-mono mb-1">{formatTime(hoveredTrade.timestamp, true)}</div>
            {showSpot && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">Spot Price:</span>
                <span className="text-sky-400 font-mono font-bold">{Number(hoveredTrade.spotPrice).toFixed(2)}</span>
              </div>
            )}
            {showPcr && (
              <div className="flex justify-between gap-4">
                <span className="text-zinc-400">PCR:</span>
                <span className="text-orange-400 font-mono font-bold">{Number(hoveredTrade.pcr).toFixed(2)}</span>
              </div>
            )}
            {showSpot && hoveredTrade.signal && (
              <div className="flex justify-between gap-4 border-t border-zinc-900 mt-1.5 pt-1.5">
                <span className="text-zinc-400">Signal:</span>
                <span className={`font-bold ${getSignalTheme(hoveredTrade.signal).text}`}>
                  {hoveredTrade.signal}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
