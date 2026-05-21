"use client";

import { useTabStore, Tab } from "@/store/tab-store";
import { useState } from "react";

const methodColors: Record<string, string> = {
  GET: "text-green-400",
  POST: "text-yellow-400",
  PUT: "text-blue-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-gray-400",
  OPTIONS: "text-cyan-400",
};

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabStore();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex flex-1 items-center overflow-x-auto">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
          />
        ))}

        {/* New Tab Button */}
        <button
          type="button"
          className="flex h-9 items-center px-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="New tab"
          title="New tab"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [showClose, setShowClose] = useState(false);

  return (
    <div
      className={`group relative flex h-9 min-w-0 max-w-[180px] cursor-pointer items-center gap-1.5 border-r border-[var(--border)] px-3 text-sm ${
        isActive
          ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowClose(true)}
      onMouseLeave={() => setShowClose(false)}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
      )}

      {/* Method badge */}
      <span className={`shrink-0 text-[10px] font-bold ${methodColors[tab.method] || "text-gray-400"}`}>
        {tab.method}
      </span>

      {/* Tab name */}
      <span className="truncate text-xs">
        {tab.isDirty && <span className="mr-0.5 text-[var(--accent)]">●</span>}
        {tab.name}
      </span>

      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`ml-auto shrink-0 rounded p-0.5 hover:bg-[var(--bg-tertiary)] ${
          showClose || isActive ? "opacity-100" : "opacity-0"
        }`}
        aria-label={`Close ${tab.name}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
