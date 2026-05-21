"use client";

import { useRequestStore } from "@/store/request-store";
import { useEffect, useState } from "react";

export function ParamsEditor() {
  const { url, setUrl } = useRequestStore();
  const [params, setParams] = useState<{ key: string; value: string; enabled: boolean }[]>([
    { key: "", value: "", enabled: true },
  ]);

  // Parse URL params when URL changes externally
  useEffect(() => {
    try {
      const urlObj = new URL(url);
      const parsed: { key: string; value: string; enabled: boolean }[] = [];
      urlObj.searchParams.forEach((value, key) => {
        parsed.push({ key, value, enabled: true });
      });
      if (parsed.length > 0) {
        setParams([...parsed, { key: "", value: "", enabled: true }]);
      }
    } catch {
      // Invalid URL, ignore
    }
  }, []); // Only on mount

  const updateUrl = (newParams: typeof params) => {
    try {
      const baseUrl = url.split("?")[0];
      const searchParams = new URLSearchParams();
      newParams
        .filter((p) => p.enabled && p.key.trim())
        .forEach((p) => searchParams.append(p.key, p.value));

      const queryString = searchParams.toString();
      setUrl(queryString ? `${baseUrl}?${queryString}` : baseUrl);
    } catch {
      // Invalid URL, skip
    }
  };

  const updateParam = (
    index: number,
    field: "key" | "value" | "enabled",
    value: string | boolean
  ) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };

    // Auto-add empty row at end
    const lastParam = newParams[newParams.length - 1];
    if (lastParam.key.trim() || lastParam.value.trim()) {
      newParams.push({ key: "", value: "", enabled: true });
    }

    setParams(newParams);
    updateUrl(newParams);
  };

  const removeParam = (index: number) => {
    if (params.length === 1) return;
    const newParams = params.filter((_, i) => i !== index);
    setParams(newParams);
    updateUrl(newParams);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="w-6"></span>
          <span>Key</span>
          <span>Value</span>
          <span className="w-6"></span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const newParams = params.map((p) => ({
                ...p,
                value: p.value ? encodeURIComponent(p.value) : p.value,
              }));
              setParams(newParams);
              updateUrl(newParams);
            }}
            className="rounded px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="URL encode all values"
          >
            Encode
          </button>
          <button
            type="button"
            onClick={() => {
              const newParams = params.map((p) => ({
                ...p,
                value: p.value ? decodeURIComponent(p.value) : p.value,
              }));
              setParams(newParams);
              updateUrl(newParams);
            }}
            className="rounded px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="URL decode all values"
          >
            Decode
          </button>
        </div>
      </div>

      {params.map((param, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2"
        >
          <input
            type="checkbox"
            checked={param.enabled}
            onChange={(e) => updateParam(index, "enabled", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
            aria-label={`Enable parameter ${param.key || index + 1}`}
          />
          <input
            type="text"
            value={param.key}
            onChange={(e) => updateParam(index, "key", e.target.value)}
            placeholder="Parameter name"
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <input
            type="text"
            value={param.value}
            onChange={(e) => updateParam(index, "value", e.target.value)}
            placeholder="Value"
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <button
            type="button"
            onClick={() => removeParam(index)}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
            aria-label="Remove parameter"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
