"use client";

import { useRef, useState } from "react";
import { useEnvironmentStore } from "@/store/environment-store";
import { VariablePopover } from "../environment/variable-popover";

interface UrlBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function UrlBar({ value, onChange, placeholder }: UrlBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [popover, setPopover] = useState<{ name: string; x: number; y: number } | null>(null);
  const { getResolvedVariables } = useEnvironmentStore();

  const resolvedVars = getResolvedVariables();

  const handleVariableClick = (e: React.MouseEvent, varName: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setPopover({ name: varName, x: rect.left, y: rect.bottom });
  };

  // Parse URL to find {{variable}} patterns and highlight them
  const renderHighlightedUrl = () => {
    if (!value) return null;
    const parts: { text: string; isVar: boolean; resolved: boolean; varName?: string }[] = [];
    const regex = /\{\{\s*([^}]+?)\s*\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: value.slice(lastIndex, match.index), isVar: false, resolved: false });
      }
      const varName = match[1].trim();
      const isResolved = varName in resolvedVars;
      parts.push({ text: match[0], isVar: true, resolved: isResolved, varName });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < value.length) {
      parts.push({ text: value.slice(lastIndex), isVar: false, resolved: false });
    }

    return (
      <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-3 text-sm whitespace-nowrap">
        {parts.map((part, i) => (
          <span
            key={i}
            className={
              part.isVar
                ? part.resolved
                  ? "pointer-events-auto cursor-pointer rounded bg-green-500/15 px-0.5 text-green-400 font-medium hover:bg-green-500/25"
                  : "pointer-events-auto cursor-pointer rounded bg-red-500/15 px-0.5 text-red-400 font-medium hover:bg-red-500/25"
                : "text-transparent"
            }
            onClick={part.isVar ? (e) => handleVariableClick(e, part.varName!) : undefined}
            title={part.isVar ? `Click to edit {{${part.varName}}}` : undefined}
          >
            {part.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex-1">
      {/* Highlight overlay (only visible when not focused for cleaner editing) */}
      {!isFocused && value && renderHighlightedUrl()}
      {/* Actual input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || "Enter URL or paste text"}
        className={`w-full rounded bg-transparent px-3 py-2 text-sm outline-none ${
          isFocused ? "text-[var(--text-primary)]" : value.includes("{{") ? "text-[var(--text-primary)]/70" : "text-[var(--text-primary)]"
        } placeholder-[var(--text-secondary)]`}
        aria-label="Request URL"
      />

      {/* Variable Quick-Edit Popover */}
      {popover && (
        <VariablePopover
          variableName={popover.name}
          position={{ x: popover.x, y: popover.y }}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  );
}
