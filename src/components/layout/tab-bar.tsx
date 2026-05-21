"use client";

import { useTabStore, Tab } from "@/store/tab-store";
import { useCollectionStore } from "@/store/collection-store";
import { useRequestStore } from "@/store/request-store";
import { useState } from "react";
import { X, Plus } from "lucide-react";

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
  const { tabs, activeTabId, setActiveTab, closeTab, closeAllTabs, closeOtherTabs } = useTabStore();
  const { setActiveRequest } = useCollectionStore();
  const { setMethod, setUrl, setHeaders, setBody, setBodyType } = useRequestStore();
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);

  if (tabs.length === 0) {
    return (
      <div className="flex h-10 items-center border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 sm:h-9 sm:px-4">
        <span className="text-xs text-[var(--text-secondary)]">No open tabs</span>
      </div>
    );
  }

  const handleTabSelect = (tab: Tab) => {
    setActiveTab(tab.id);
    setActiveRequest(tab.requestId);
    // Load request data - we'd need to find it from collection store
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex flex-1 items-center overflow-x-auto overscroll-x-contain">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => handleTabSelect(tab)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            />
          ))}

          {/* New Tab Button */}
          <button
            type="button"
            className="flex h-10 items-center px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:h-9 sm:px-3"
            aria-label="New tab"
            title="New tab"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg sm:w-44"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => { closeTab(contextMenu.tabId); setContextMenu(null); }}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => { closeOtherTabs(contextMenu.tabId); setContextMenu(null); }}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Close Others
            </button>
            <button
              type="button"
              onClick={() => { closeAllTabs(); setContextMenu(null); }}
              className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Close All
            </button>
          </div>
        </>
      )}
    </>
  );
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  onContextMenu,
}: {
  tab: Tab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editName, setEditName] = useState(tab.name);
  const { updateTab } = useTabStore();

  const handleRename = () => {
    if (editName.trim() && editName !== tab.name) {
      updateTab(tab.id, { name: editName.trim() });
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={`group relative flex h-9 min-w-0 max-w-[200px] cursor-pointer items-center gap-1.5 border-r border-[var(--border)] px-3 text-sm ${
        isActive
          ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      }`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onDoubleClick={(e) => { e.stopPropagation(); setIsRenaming(true); setEditName(tab.name); }}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
      )}

      {/* Method badge */}
      <span className={`shrink-0 text-[10px] font-bold ${methodColors[tab.method] || "text-gray-400"}`}>
        {tab.method}
      </span>

      {/* Tab name or rename input */}
      {isRenaming ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
          className="w-full min-w-[60px] rounded bg-[var(--bg-tertiary)] px-1 text-xs text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
          autoFocus
          onClick={(e) => e.stopPropagation()}
          aria-label="Rename tab"
          title="Rename tab"
        />
      ) : (
        <span className="truncate text-xs">
          {tab.isDirty && <span className="mr-0.5 text-[var(--accent)]">●</span>}
          {tab.name}
        </span>
      )}

      {/* Close button */}
      {!isRenaming && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-auto shrink-0 rounded p-0.5 opacity-0 hover:bg-[var(--bg-tertiary)] group-hover:opacity-100"
          aria-label={`Close ${tab.name}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
