"use client";

import React, { useState } from "react";
import { Trade, V3VersionTrade } from "../types";
import { useChartZoomPan } from "../hooks/useChartZoomPan";
import { formatTime } from "../lib/trade-utils";
import { BarChartIcon, MaximizeIcon, MinimizeIcon } from "./common/Icons";

export function InteractiveAggressionChart({ trades }: { trades: (Trade | V3VersionTrade)[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

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
  const hasAggressionData = trades.some((t) => "avgCeAggr" in t && (t as any).avgCeAggr !== undefined);

  const visibleTrades = trades.slice(startIndex, endIndex + 1);
  const height = 300;

  if (trades.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs py-12">
        No data points logged. Waiting for live feed...
      </div>
    );
  }

  if (!hasAggressionData) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-zinc-500 text-xs py-12 space-y-2">
        <BarChartIcon className="w-8 h-8 text-zinc-600" />
        <span>Aggression indicators are only tracked in V2 &amp; V1 Engines.</span>
        <span className="text-zinc-600 text-[11px]">V3 uses Delta-weighted Order Flow Imbalance.</span>
      </div>
    );
  }

  const ceAggrs = visibleTrades.map((t) => Number((t as any).avgCeAggr || 0));
  const peAggrs = visibleTrades.map((t) => Number((t as any).avgPeAggr || 0));

  const minVal = Math.min(...ceAggrs, ...peAggrs);
  const maxVal = Math.max(...ceAggrs, ...peAggrs);
  const range = maxVal - minVal || 1.0;
  const yMin = Math.max(0, minVal - range * 0.1);
  const yMax = maxVal + range * 0.1;

  const getX = (index: number) => {
    if (endIndex <= startIndex) return padding.left;
    const relativeIndex = index - startIndex;
    const totalVisible = endIndex - startIndex;
    return padding.left + (relativeIndex / totalVisible) * (chartWidth - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return height - padding.bottom - ((val - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);
  };

  let cePath = "";
  let pePath = "";

  visibleTrades.forEach((t, i) => {
    const absoluteIndex = startIndex + i;
    const x = getX(absoluteIndex);
    const yCe = getY(Number((t as any).avgCeAggr || 0));
    const yPe = getY(Number((t as any).avgPeAggr || 0));

    if (i === 0) {
      cePath = `M ${x} ${yCe}`;
      pePath = `M ${x} ${yPe}`;
    } else {
      cePath += ` L ${x} ${yCe}`;
      pePath += ` L ${x} ${yPe}`;
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
            className="h-1.5 w-24 sm:w-32 rounded-lg bg-zinc-800 accent-emerald-500 cursor-pointer"
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            CE Aggression
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            PE Aggression
          </div>
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
            const val = yMax - p * (yMax - yMin);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#3f3f46" strokeDasharray="3,3" className="opacity-20" />
                <text x={padding.left - 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="end" className="font-mono opacity-90">
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* CE Aggression Line */}
          <path d={cePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* PE Aggression Line */}
          <path d={pePath} fill="none" stroke="#f43f5e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover Crosshairs & Dots */}
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
              <circle cx={getX(hoveredIndex)} cy={getY(Number((hoveredTrade as any).avgCeAggr || 0))} r={4} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
              <circle cx={getX(hoveredIndex)} cy={getY(Number((hoveredTrade as any).avgPeAggr || 0))} r={4} fill="#f43f5e" stroke="#fff" strokeWidth={1.5} />
            </g>
          )}
        </svg>

        {/* Tooltip HTML Overlay */}
        {tooltipPos && hoveredTrade && (
          <div
            className="absolute z-50 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md pointer-events-none text-xs font-sans min-w-[170px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="text-zinc-500 font-mono mb-1">{formatTime(hoveredTrade.timestamp, true)}</div>
            <div className="flex justify-between gap-4">
              <span className="text-emerald-400 font-semibold">CE Aggression:</span>
              <span className="text-emerald-300 font-mono font-bold">{Number((hoveredTrade as any).avgCeAggr || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 mt-1">
              <span className="text-rose-400 font-semibold">PE Aggression:</span>
              <span className="text-rose-300 font-mono font-bold">{Number((hoveredTrade as any).avgPeAggr || 0).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
