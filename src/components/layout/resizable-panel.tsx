"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ResizablePanelProps {
  direction: "horizontal" | "vertical";
  defaultRatio?: number; // 0-1, default split ratio
  minSize?: number; // minimum px for first panel
  maxSize?: number; // maximum px for first panel
  first: React.ReactNode;
  second: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  direction,
  defaultRatio = 0.5,
  minSize = 100,
  maxSize,
  first,
  second,
  className = "",
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(defaultRatio);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let newRatio: number;
      if (direction === "vertical") {
        const y = e.clientY - rect.top;
        newRatio = y / rect.height;
      } else {
        const x = e.clientX - rect.left;
        newRatio = x / rect.width;
      }

      // Clamp
      const containerSize = direction === "vertical" ? rect.height : rect.width;
      const minRatio = minSize / containerSize;
      const maxRatio = maxSize ? maxSize / containerSize : 0.85;
      newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));

      setRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, direction, minSize, maxSize]);

  const isVertical = direction === "vertical";

  return (
    <div
      ref={containerRef}
      className={`flex ${isVertical ? "flex-col" : "flex-row"} ${className}`}
      style={{ position: "relative" }}
    >
      {/* First Panel */}
      <div
        className="overflow-auto"
        style={{
          [isVertical ? "height" : "width"]: `${ratio * 100}%`,
          minHeight: isVertical ? minSize : undefined,
          minWidth: !isVertical ? minSize : undefined,
        }}
      >
        {first}
      </div>

      {/* Divider */}
      <div
        className={`group relative flex items-center justify-center ${
          isVertical
            ? "h-1 cursor-row-resize hover:bg-[var(--accent)]/30"
            : "w-1 cursor-col-resize hover:bg-[var(--accent)]/30"
        } ${isDragging ? "bg-[var(--accent)]/50" : "bg-[var(--border)]"} transition-colors`}
        onMouseDown={handleMouseDown}
      >
        {/* Drag indicator */}
        <div
          className={`rounded-full bg-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity ${
            isVertical ? "h-1 w-8" : "h-8 w-1"
          }`}
        />
      </div>

      {/* Second Panel */}
      <div
        className="overflow-auto"
        style={{
          [isVertical ? "height" : "width"]: `${(1 - ratio) * 100}%`,
          minHeight: isVertical ? minSize : undefined,
          minWidth: !isVertical ? minSize : undefined,
        }}
      >
        {second}
      </div>

      {/* Overlay during drag to prevent iframe/selection issues */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-row-resize" />}
    </div>
  );
}
