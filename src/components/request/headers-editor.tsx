"use client";

import { useRequestStore } from "@/store/request-store";
import { useState, useRef } from "react";
import { Trash2, Plus } from "lucide-react";

const COMMON_HEADERS = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Cookie",
  "Host",
  "If-Modified-Since",
  "If-None-Match",
  "Origin",
  "Referer",
  "User-Agent",
  "X-API-Key",
  "X-Requested-With",
  "X-CSRF-Token",
];

const CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
  "text/html",
];

export function HeadersEditor() {
  const { headers, setHeaders } = useRequestStore();

  const updateHeader = (
    index: number,
    field: "key" | "value" | "enabled" | "description",
    value: string | boolean
  ) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  };

  const removeHeader = (index: number) => {
    if (headers.length === 1) return;
    setHeaders(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header Row Labels */}
      <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span className="w-5"></span>
        <span>Key</span>
        <span>Value</span>
        <span className="w-6"></span>
      </div>

      {/* Header Rows */}
      {headers.map((header, index) => (
        <HeaderRow
          key={index}
          header={header}
          index={index}
          onUpdate={updateHeader}
          onRemove={removeHeader}
        />
      ))}

      {/* Add Header Button */}
      <button
        type="button"
        onClick={addHeader}
        className="mt-1 flex items-center gap-1 self-start rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <Plus size={12} />
        Add Header
      </button>
    </div>
  );
}

function HeaderRow({
  header,
  index,
  onUpdate,
  onRemove,
}: {
  header: { key: string; value: string; enabled: boolean };
  index: number;
  onUpdate: (index: number, field: "key" | "value" | "enabled", value: string | boolean) => void;
  onRemove: (index: number) => void;
}) {
  const [showKeySuggestions, setShowKeySuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);

  const filteredHeaders = COMMON_HEADERS.filter(
    (h) => h.toLowerCase().includes(header.key.toLowerCase()) && header.key.trim().length > 0
  );

  const filteredValues =
    header.key.toLowerCase() === "content-type"
      ? CONTENT_TYPES.filter((v) => v.toLowerCase().includes(header.value.toLowerCase()))
      : [];

  return (
    <div className="relative grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
      <input
        type="checkbox"
        checked={header.enabled}
        onChange={(e) => onUpdate(index, "enabled", e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
        aria-label={`Enable header ${header.key || index + 1}`}
      />
      <div className="relative">
        <input
          ref={keyRef}
          type="text"
          value={header.key}
          onChange={(e) => {
            onUpdate(index, "key", e.target.value);
            setShowKeySuggestions(true);
          }}
          onFocus={() => setShowKeySuggestions(true)}
          onBlur={() => setTimeout(() => setShowKeySuggestions(false), 150)}
          placeholder="Header name"
          className="w-full rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
        />
        {showKeySuggestions && filteredHeaders.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-[150px] w-full overflow-auto rounded border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            {filteredHeaders.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onUpdate(index, "key", suggestion);
                  setShowKeySuggestions(false);
                }}
                className="flex w-full px-2 py-1 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={header.value}
          onChange={(e) => {
            onUpdate(index, "value", e.target.value);
            setShowValueSuggestions(true);
          }}
          onFocus={() => setShowValueSuggestions(true)}
          onBlur={() => setTimeout(() => setShowValueSuggestions(false), 150)}
          placeholder="Value"
          className="w-full rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
        />
        {showValueSuggestions && filteredValues.length > 0 && (
          <div className="absolute left-0 top-full z-50 mt-1 max-h-[150px] w-full overflow-auto rounded border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            {filteredValues.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onUpdate(index, "value", suggestion);
                  setShowValueSuggestions(false);
                }}
                className="flex w-full px-2 py-1 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
        aria-label="Remove header"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
