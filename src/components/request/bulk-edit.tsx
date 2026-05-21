"use client";

import { useState } from "react";

interface BulkEditProps {
  items: { key: string; value: string; enabled: boolean }[];
  onApply: (items: { key: string; value: string; enabled: boolean }[]) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Bulk Edit - Edit headers/params as raw text (key:value per line)
 * Like Postman's bulk edit mode
 */
export function BulkEdit({ items, onApply, onClose, title = "Bulk Edit" }: BulkEditProps) {
  const [text, setText] = useState(() => {
    return items
      .filter((item) => item.key.trim())
      .map((item) => `${item.enabled ? "" : "//"}${item.key}:${item.value}`)
      .join("\n");
  });

  const handleApply = () => {
    const lines = text.split("\n").filter((line) => line.trim());
    const parsed = lines.map((line) => {
      const disabled = line.startsWith("//");
      const cleanLine = disabled ? line.slice(2) : line;
      const colonIndex = cleanLine.indexOf(":");
      if (colonIndex === -1) {
        return { key: cleanLine.trim(), value: "", enabled: !disabled };
      }
      return {
        key: cleanLine.substring(0, colonIndex).trim(),
        value: cleanLine.substring(colonIndex + 1).trim(),
        enabled: !disabled,
      };
    });

    // Always add an empty row at the end
    parsed.push({ key: "", value: "", enabled: true });
    onApply(parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-2 text-[10px] text-[var(--text-secondary)]">
          Format: key:value (one per line). Prefix with // to disable.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Content-Type:application/json\nAuthorization:Bearer token\n//X-Disabled:value"}
          className="mb-3 h-48 w-full resize-none rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          spellCheck={false}
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
