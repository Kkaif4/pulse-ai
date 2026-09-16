"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface UseChartZoomPanOptions {
  dataLength: number;
  padding?: Padding;
}

export function useChartZoomPan({
  dataLength,
  padding = { top: 20, right: 45, bottom: 35, left: 55 },
}: UseChartZoomPanOptions) {
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number }>({ start: 0, end: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const dragStartRef = useRef<number | null>(null);
  const zoomRangeStartOnDragRef = useRef<{ start: number; end: number } | null>(null);

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

  // Auto-scroll to extreme right (latest data) on load, zoom change, or data update
  useEffect(() => {
    const scroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
      }
    };
    scroll();
    const timer = setTimeout(scroll, 50);
    return () => clearTimeout(timer);
  }, [dataLength, isFullscreen]);

  const startIndex = Math.max(0, Math.floor(zoomRange.start * Math.max(0, dataLength - 1)));
  const endIndex = Math.min(Math.max(0, dataLength - 1), Math.ceil(zoomRange.end * Math.max(0, dataLength - 1)));
  const visibleCount = Math.max(1, endIndex - startIndex + 1);

  // In fullscreen, fit exactly onto single screen without scrollbars
  const chartWidth = isFullscreen ? 1200 : Math.max(800, visibleCount * 14);

  // Wheel zoom handler attached directly to SVG element
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (dataLength < 5) return;

      const zoomIntensity = 0.08;

      setZoomRange((prev) => {
        const currentSpan = prev.end - prev.start;
        const change = currentSpan * zoomIntensity * (e.deltaY > 0 ? 1 : -1);

        const rect = svgEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const viewBoxX = (mouseX / rect.width) * chartWidth;
        const innerChartWidth = chartWidth - padding.left - padding.right;
        const relativeX = viewBoxX - padding.left;
        const pct = Math.max(0, Math.min(1, relativeX / innerChartWidth));

        let newStart = prev.start + change * pct;
        let newEnd = prev.end - change * (1 - pct);

        const minSpan = Math.max(0.02, 5 / dataLength);
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
  }, [dataLength, chartWidth, padding.left, padding.right]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (zoomRange.start > 0 || zoomRange.end < 1) {
        setIsDragging(true);
        dragStartRef.current = e.clientX;
        zoomRangeStartOnDragRef.current = { ...zoomRange };
      }
    },
    [zoomRange]
  );

  const handleMouseMoveForPan = useCallback(
    (clientX: number) => {
      if (!isDragging || dragStartRef.current === null || zoomRangeStartOnDragRef.current === null || !svgRef.current) {
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const deltaX = clientX - dragStartRef.current;
      const mainChartWidth = chartWidth - padding.left - padding.right;
      const chartWidthInDOM = rect.width * (mainChartWidth / chartWidth);
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
    },
    [isDragging, chartWidth, padding.left, padding.right]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
    zoomRangeStartOnDragRef.current = null;
  }, []);

  const calculateHoverIndex = useCallback(
    (clientX: number): number | null => {
      if (!svgRef.current || dataLength === 0) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const viewBoxX = (mouseX / rect.width) * chartWidth;
      const innerChartWidth = chartWidth - padding.left - padding.right;
      const relativeX = viewBoxX - padding.left;
      const pct = Math.max(0, Math.min(1, relativeX / innerChartWidth));
      const visibleLength = endIndex - startIndex;
      const index = startIndex + Math.round(pct * visibleLength);
      return Math.max(0, Math.min(dataLength - 1, index));
    },
    [chartWidth, padding.left, padding.right, startIndex, endIndex, dataLength]
  );

  const handleResetZoom = useCallback(() => {
    setZoomRange({ start: 0, end: 1 });
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const span = 1 - val;
    setZoomRange({ start: 1 - span, end: 1 });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return {
    zoomRange,
    setZoomRange,
    startIndex,
    endIndex,
    visibleCount,
    chartWidth,
    isDragging,
    isFullscreen,
    setIsFullscreen,
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
  };
}
