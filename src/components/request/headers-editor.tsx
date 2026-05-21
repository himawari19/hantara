"use client";

import { useRequestStore } from "@/store/request-store";

export function HeadersEditor() {
  const { headers, setHeaders } = useRequestStore();

  const updateHeader = (
    index: number,
    field: "key" | "value" | "enabled",
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
        <span className="w-6"></span>
        <span>Key</span>
        <span>Value</span>
        <span className="w-6"></span>
      </div>

      {/* Header Rows */}
      {headers.map((header, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
        >
          <input
            type="checkbox"
            checked={header.enabled}
            onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
            aria-label={`Enable header ${header.key || index + 1}`}
          />
          <input
            type="text"
            value={header.key}
            onChange={(e) => updateHeader(index, "key", e.target.value)}
            placeholder="Header name"
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <input
            type="text"
            value={header.value}
            onChange={(e) => updateHeader(index, "value", e.target.value)}
            placeholder="Value"
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <button
            onClick={() => removeHeader(index)}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
            aria-label="Remove header"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {/* Add Header Button */}
      <button
        onClick={addHeader}
        className="mt-1 flex items-center gap-1 self-start rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Header
      </button>
    </div>
  );
}
