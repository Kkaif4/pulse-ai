import { useState, useRef, useEffect } from "react";
import { Trade } from "../types";

export function InteractiveAggressionChart({ trades }: { trades: Trade[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<number | null>(null);
  const zoomRangeStartOnDragRef = useRef<{ start: number; end: number } | null>(null);

  if (trades.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs py-12">
        No data points logged. Waiting for live feed...
      </div>
    );
  }

  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 45, bottom: 35, left: 55 };

  const startIndex = Math.max(0, Math.floor(zoomRange.start * (trades.length - 1)));
  const endIndex = Math.min(trades.length - 1, Math.ceil(zoomRange.end * (trades.length - 1)));
  const visibleTrades = trades.slice(startIndex, endIndex + 1);

  const ceAggrs = visibleTrades.map((t) => Number(t.avgCeAggr));
  const peAggrs = visibleTrades.map((t) => Number(t.avgPeAggr));

  const minVal = Math.min(...ceAggrs, ...peAggrs);
  const maxVal = Math.max(...ceAggrs, ...peAggrs);
  const range = maxVal - minVal || 1.0;
  const yMin = Math.max(0, minVal - range * 0.1);
  const yMax = maxVal + range * 0.1;

  const getX = (index: number) => {
    if (endIndex <= startIndex) return padding.left;
    const relativeIndex = index - startIndex;
    const totalVisible = endIndex - startIndex;
    return padding.left + (relativeIndex / totalVisible) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return height - padding.bottom - ((val - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);
  };

  let cePath = "";
  let pePath = "";

  visibleTrades.forEach((t, i) => {
    const absoluteIndex = startIndex + i;
    const x = getX(absoluteIndex);
    const yCe = getY(Number(t.avgCeAggr));
    const yPe = getY(Number(t.avgPeAggr));

    if (i === 0) {
      cePath = `M ${x} ${yCe}`;
      pePath = `M ${x} ${yPe}`;
    } else {
      cePath += ` L ${x} ${yCe}`;
      pePath += ` L ${x} ${yPe}`;
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
        const viewBoxX = (mouseX / rect.width) * width;
        const chartWidth = width - padding.left - padding.right;
        const relativeX = viewBoxX - padding.left;
        const pct = Math.max(0, Math.min(1, relativeX / chartWidth));

        let newStart = prev.start + change * pct;
        let newEnd = prev.end - change * (1 - pct);

        const minSpan = Math.max(0.02, 5 / trades.length);
        if (newEnd - newStart < minSpan) {
          const center = (prev.start + prev.end) / 2;
          newStart = center - minSpan / 2;
          newEnd = center + minSpan / 2;
        }

        newStart = Math.max(0, newStart);
        newEnd = Math.min(1, newEnd);

        return { start: newStart, end: newEnd };
      });
    };

    svgEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svgEl.removeEventListener("wheel", handleWheel);
    };
  }, [trades.length]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (zoomRange.start > 0 || zoomRange.end < 1) {
      setIsDragging(true);
      dragStartRef.current = e.clientX;
      zoomRangeStartOnDragRef.current = { ...zoomRange };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const viewBoxX = (mouseX / rect.width) * width;

    if (isDragging && dragStartRef.current !== null && zoomRangeStartOnDragRef.current !== null) {
      const deltaX = e.clientX - dragStartRef.current;
      const chartWidthInDOM = rect.width * ((width - padding.left - padding.right) / width);
      const pctChange = deltaX / chartWidthInDOM;

      const span = zoomRangeStartOnDragRef.current.end - zoomRangeStartOnDragRef.current.start;
      let newStart = zoomRangeStartOnDragRef.current.start - pctChange * span;
      let newEnd = zoomRangeStartOnDragRef.current.end - pctChange * span;

      if (newStart < 0) {
        newStart = 0;
        newEnd = span;
      }
      if (newEnd > 1) {
        newEnd = 1;
        newStart = 1 - span;
      }

      setZoomRange({ start: newStart, end: newEnd });
    }

    const chartWidth = width - padding.left - padding.right;
    const relativeX = viewBoxX - padding.left;
    const pct = Math.max(0, Math.min(1, relativeX / chartWidth));
    const visibleLength = endIndex - startIndex;
    const index = startIndex + Math.round(pct * visibleLength);

    if (index >= startIndex && index <= endIndex && index < trades.length) {
      setHoveredIndex(index);
      setTooltipPos({ x: mouseX + 15, y: mouseY - 15 });
    } else {
      setHoveredIndex(null);
      setTooltipPos(null);
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
    <div className="relative w-full h-full flex flex-col">
      <div className="flex gap-4 items-center justify-end px-4 mb-2 text-xs">
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>

      <div className="relative flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full h-full select-none ${isZoomed ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
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
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#3f3f46" strokeDasharray="3,3" className="opacity-20" />
                <text x={padding.left - 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="end" className="font-mono opacity-90">
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* CE Aggression Line */}
          <path d={cePath} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* PE Aggression Line */}
          <path d={pePath} fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

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
              <circle cx={getX(hoveredIndex)} cy={getY(Number(hoveredTrade.avgCeAggr))} r={4} fill="#22c55e" stroke="#fff" strokeWidth={1} />
              <circle cx={getX(hoveredIndex)} cy={getY(Number(hoveredTrade.avgPeAggr))} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1} />
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
            <div className="flex justify-between gap-4 text-green-400 font-medium">
              <span>Call Aggr (CE):</span>
              <span className="font-mono font-bold">{Number(hoveredTrade.avgCeAggr).toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4 text-red-400 font-medium">
              <span>Put Aggr (PE):</span>
              <span className="font-mono font-bold">{Number(hoveredTrade.avgPeAggr).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
