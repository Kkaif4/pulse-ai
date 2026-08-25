import { useState, useRef, useEffect } from "react";
import { Trade } from "../types";

export function InteractiveTradingChart({ trades }: { trades: Trade[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showSpot, setShowSpot] = useState<boolean>(true);
  const [showPcr, setShowPcr] = useState<boolean>(true);
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
    return padding.left + (relativeIndex / totalVisible) * (width - padding.left - padding.right);
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
            className="mr-auto px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Reset Zoom
          </button>
        )}
        <button
          onClick={() => setShowSpot(!showSpot)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${showSpot
              ? "bg-sky-500/10 border-sky-500 text-sky-400 font-medium"
              : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${showSpot ? "bg-sky-400" : "bg-zinc-600"}`} />
          Spot Price
        </button>
        <button
          onClick={() => setShowPcr(!showPcr)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${showPcr
              ? "bg-orange-500/10 border-orange-500 text-orange-400 font-medium"
              : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
        >
          <span className={`w-2 h-2 rounded-full ${showPcr ? "bg-orange-400" : "bg-zinc-600"}`} />
          PCR Trend
        </button>
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
            const spotVal = yMaxSpot - p * (yMaxSpot - yMinSpot);
            const pcrVal = yMaxPcr - p * (yMaxPcr - yMinPcr);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#3f3f46" strokeDasharray="3,3" className="opacity-20" />
                {showSpot && (
                  <text x={padding.left - 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="end" className="font-mono opacity-90">
                    {Math.round(spotVal)}
                  </text>
                )}
                {showPcr && (
                  <text x={width - padding.right + 8} y={y + 4} fill="#ffffff" fontSize={9} textAnchor="start" className="font-mono opacity-90">
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

          {/* PCR Line (right axis representation) */}
          {showPcr && (
            <path d={pcrPath} fill="none" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4,2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Signal Markers */}
          {showSpot && visibleTrades.map((t, i) => {
            const absoluteIndex = startIndex + i;
            const x = getX(absoluteIndex);
            const y = getYSpot(Number(t.spotPrice));
            if (t.signal && t.signal.includes("BUY CE")) {
              return (
                <polygon
                  key={absoluteIndex}
                  points={`${x},${y - 6} ${x - 5},${y + 3} ${x + 5},${y + 3}`}
                  fill="#22c55e"
                />
              );
            } else if (t.signal && t.signal.includes("BUY PE")) {
              return (
                <polygon
                  key={absoluteIndex}
                  points={`${x},${y + 6} ${x - 5},${y - 3} ${x + 5},${y - 3}`}
                  fill="#ef4444"
                />
              );
            } else if (t.signal && t.signal.includes("EXIT")) {
              return <circle key={absoluteIndex} cx={x} cy={y} r={4} fill="#a855f7" />;
            }
            return null;
          })}

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
              {showSpot && (
                <circle cx={getX(hoveredIndex)} cy={getYSpot(Number(hoveredTrade.spotPrice))} r={5} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
              )}
              {showPcr && (
                <circle cx={getX(hoveredIndex)} cy={getYPcr(Number(hoveredTrade.pcr))} r={4} fill="#f97316" stroke="#fff" strokeWidth={1} />
              )}
            </g>
          )}
        </svg>

        {/* Tooltip HTML Overlay */}
        {tooltipPos && hoveredTrade && (
          <div
            className="absolute z-50 rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-md pointer-events-none text-xs font-sans min-w-[170px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="text-zinc-500 font-mono mb-1">{new Date(hoveredTrade.timestamp).toLocaleTimeString()}</div>
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
                <span
                  className={`font-bold ${hoveredTrade.signal.includes("BUY CE")
                    ? "text-green-400"
                    : hoveredTrade.signal.includes("BUY PE")
                      ? "text-red-400"
                      : "text-zinc-400"
                    }`}
                >
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
