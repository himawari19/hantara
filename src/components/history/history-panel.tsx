"use client";

import { useRequestStore, HistoryItem } from "@/store/request-store";
import { useState } from "react";
import { Search, Trash2, Download } from "lucide-react";

export function HistoryPanel() {
  const { history, clearHistory, setMethod, setUrl } = useRequestStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("all");

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.method.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = filterMethod === "all" || item.method === filterMethod;
    return matchesSearch && matchesMethod;
  });

  // Group by date
  const grouped = groupByDate(filteredHistory);

  const handleExport = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hantara-history.json";
    a.click();
    URL.revokeObjectURL(url);
  };

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
    HEAD: "text-gray-400",
    OPTIONS: "text-cyan-400",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          History ({filteredHistory.length})
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleExport}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Export history"
            aria-label="Export history"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
            title="Clear history"
            aria-label="Clear history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <div className="flex flex-1 items-center gap-1.5 rounded bg-[var(--bg-tertiary)] px-2 py-1">
          <Search size={12} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by URL..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
          aria-label="Filter by method"
        >
          <option value="all">All</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto">
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <div className="sticky top-0 bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-medium uppercase text-[var(--text-secondary)]">
              {date}
            </div>
            {items.map((item) => (
              <button
                key={item.id}
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
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByDate(items: HistoryItem[]): Record<string, HistoryItem[]> {
  const groups: Record<string, HistoryItem[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  items.forEach((item) => {
    const date = new Date(item.timestamp).toDateString();
    let label: string;
    if (date === today) label = "Today";
    else if (date === yesterday) label = "Yesterday";
    else label = new Date(item.timestamp).toLocaleDateString();

    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  return groups;
}
