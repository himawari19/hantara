"use client";

import { useRequestStore } from "@/store/request-store";

export function HistoryPanel() {
  const { history, clearHistory, setMethod, setUrl } = useRequestStore();

  if (history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">No request history yet.</p>
      </div>
    );
  }

  const statusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-[var(--success)]";
    if (status >= 400) return "text-[var(--error)]";
    return "text-[var(--warning)]";
  };

  const methodColor: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          History ({history.length})
        </span>
        <button
          type="button"
          onClick={clearHistory}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)]"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {history.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setMethod(item.method as any);
              setUrl(item.url);
            }}
            className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--bg-tertiary)]"
          >
            <span className={`min-w-[40px] text-[10px] font-bold ${methodColor[item.method] || "text-gray-400"}`}>
              {item.method}
            </span>
            <span className="flex-1 truncate text-xs text-[var(--text-secondary)]">
              {item.url}
            </span>
            <span className={`text-[10px] font-bold ${statusColor(item.status)}`}>
              {item.status}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {item.time}ms
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
