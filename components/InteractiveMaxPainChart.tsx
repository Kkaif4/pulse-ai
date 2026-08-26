import { useState, useRef, useEffect } from "react";
import { Trade, OldVersionTrade } from "../types";

export function InteractiveMaxPainChart({ trades }: { trades: (Trade | OldVersionTrade)[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);
  const zoomRangeStartOnDragRef = useRef<{ start: number; end: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Auto-scroll to extreme right (latest data) on load, zoom change, or data updates
  useEffect(() => {
    const scroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      }
    };
    scroll();
    const timer = setTimeout(scroll, 50);
    return () => clearTimeout(timer);
  }, [trades.length, isFullscreen]);

  const startIndex = Math.max(0, Math.floor(zoomRange.start * (trades.length - 1)));
  const endIndex = Math.min(trades.length - 1, Math.ceil(zoomRange.end * (trades.length - 1)));
  const visibleTrades = trades.slice(startIndex, endIndex + 1);

  // In fullscreen, we want the chart to fit exactly onto a single screen without scrollbars.
  const chartWidth = isFullscreen ? 1200 : Math.max(800, visibleTrades.length * 14);
  const height = 300;
  const padding = { top: 20, right: 45, bottom: 35, left: 65 };

  const spotPrices = visibleTrades.map((t) => Number(t.spotPrice));
  const maxPains = visibleTrades.map((t) => Number(t.maxPain));

  const minVal = Math.min(...spotPrices, ...maxPains);
  const maxVal = Math.max(...spotPrices, ...maxPains);
  const range = maxVal - minVal || 50;
  const yMin = minVal - range * 0.1;
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

  let spotPath = "";
  let maxPainPath = "";

  visibleTrades.forEach((t, i) => {
    const absoluteIndex = startIndex + i;
    const x = getX(absoluteIndex);
    const ySpot = getY(Number(t.spotPrice));
    const yMaxPain = getY(Number(t.maxPain));

    if (i === 0) {
      spotPath = `M ${x} ${ySpot}`;
      maxPainPath = `M ${x} ${yMaxPain}`;
    } else {
      spotPath += ` L ${x} ${ySpot}`;
      maxPainPath += ` L ${x} ${yMaxPain}`;
    }
  });

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (trades.length < 5) return;

      const zoomIntensity = 0.08;

      setZoomRange((prev) => {
        const currentSpan = prev.end - prev.start;
        const change = currentSpan * zoomIntensity * (e.deltaY > 0 ? 1 : -1);

        const rect = svgEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const viewBoxX = (mouseX / rect.width) * chartWidth;
        const mainChartWidth = chartWidth - padding.left - padding.right;
        const relativeX = viewBoxX - padding.left;
        const pct = Math.max(0, Math.min(1, relativeX / mainChartWidth));

        let newStart = prev.start + change * pct;
        let newEnd = prev.end - change * (1 - pct);

        if (newEnd - newStart < 0.05) {
          const center = (prev.start + prev.end) / 2;
          newStart = Math.max(0, center - 0.025);
          newEnd = Math.min(1, center + 0.025);
        }

        if (newStart < 0) newStart = 0;
        if (newEnd > 1) newEnd = 1;

        return { start: newStart, end: newEnd };
      });
    };

    svgEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgEl.removeEventListener("wheel", handleWheel);
  }, [trades.length, chartWidth]);

  if (trades.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs py-12">
        No data points logged. Waiting for live feed...
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging && dragStartRef.current !== null && zoomRangeStartOnDragRef.current !== null) {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current;
      const mainChartWidth = chartWidth - padding.left - padding.right;
      const deltaPct = (deltaX / rect.width) * (chartWidth / mainChartWidth) * (zoomRangeStartOnDragRef.current.end - zoomRangeStartOnDragRef.current.start);

      let newStart = zoomRangeStartOnDragRef.current.start - deltaPct;
      let newEnd = zoomRangeStartOnDragRef.current.end - deltaPct;

      const span = newEnd - newStart;
      if (newStart < 0) {
        newStart = 0;
        newEnd = span;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - span;
      }

      setZoomRange({ start: newStart, end: newEnd });
      return;
    }

    const svgEl = svgRef.current;
    if (!svgEl) return;

    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const viewBoxX = (mouseX / rect.width) * chartWidth;
    const viewBoxY = (mouseY / rect.height) * height;

    if (
      viewBoxX < padding.left ||
      viewBoxX > chartWidth - padding.right ||
      viewBoxY < padding.top ||
      viewBoxY > height - padding.bottom
    ) {
      setHoveredIndex(null);
      setTooltipPos(null);
      return;
    }

    const mainChartWidth = chartWidth - padding.left - padding.right;
    const relativeX = viewBoxX - padding.left;
    const pct = Math.max(0, Math.min(1, relativeX / mainChartWidth));
    const rawIndex = startIndex + Math.round(pct * (endIndex - startIndex));

    const index = Math.max(startIndex, Math.min(endIndex, rawIndex));
    setHoveredIndex(index);

    const tooltipWidth = 180;
    let tooltipX = mouseX + 15;
    if (tooltipX + tooltipWidth > rect.width) {
      tooltipX = mouseX - tooltipWidth - 15;
    }

    setTooltipPos({ x: Math.max(10, tooltipX), y: Math.max(10, mouseY - 40) });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoomRange.start > 0 || zoomRange.end < 1) {
      setIsDragging(true);
      dragStartRef.current = e.clientX;
      zoomRangeStartOnDragRef.current = { ...zoomRange };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    zoomRangeStartOnDragRef.current = null;
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    dragStartRef.current = null;
    zoomRangeStartOnDragRef.current = null;
    setHoveredIndex(null);
    setTooltipPos(null);
  };

  const resetZoom = () => {
    setZoomRange({ start: 0, end: 1 });
  };

  const hoveredTrade = hoveredIndex !== null ? trades[hoveredIndex] : null;
  const isZoomed = zoomRange.start > 0 || zoomRange.end < 1;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950 p-6"
          : "h-full w-full bg-zinc-950/80 rounded-xl border border-zinc-800/80 p-4 shadow-2xl backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200 tracking-wide text-sm">Max Pain vs Spot Trend</span>
          <span className="text-zinc-500 text-[11px] font-mono">({trades.length} pts, Full Day)</span>
        </div>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="mr-auto px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Reset Zoom
          </button>
        )}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11-5l5 5m0-5l-5 0m0 0l0 5m-6 6l-5 5m0 0l0-5m0 5l5 0m11-5l-5 5m5 0l0-5m0 5l-5 0" />
              </svg>
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>Full Screen</span>
            </>
          )}
        </button>
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
                  {Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Spot Price Line */}
          <path d={spotPath} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Max Pain Line */}
          <path d={maxPainPath} fill="none" stroke="#fb923c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover elements */}
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
              <circle cx={getX(hoveredIndex)} cy={getY(Number(hoveredTrade.spotPrice))} r={4} fill="#38bdf8" stroke="#fff" strokeWidth={1} />
              <circle cx={getX(hoveredIndex)} cy={getY(Number(hoveredTrade.maxPain))} r={4} fill="#fb923c" stroke="#fff" strokeWidth={1} />
            </g>
          )}
        </svg>

        {/* Tooltip HTML Overlay */}
        {tooltipPos && hoveredTrade && (
          <div
            className="absolute z-50 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md pointer-events-none text-xs font-sans min-w-[160px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="text-zinc-500 font-mono mb-1">{new Date(hoveredTrade.timestamp).toLocaleTimeString()}</div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-400">Spot Price:</span>
              <span className="text-sky-400 font-mono font-bold">{Number(hoveredTrade.spotPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-400">Max Pain:</span>
              <span className="text-orange-400 font-mono font-bold">{Number(hoveredTrade.maxPain).toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

