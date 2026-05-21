"use client";

import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { EnvironmentSelector } from "../environment/environment-selector";
import { Code, Terminal, Keyboard } from "lucide-react";
import { useShortcutsStore } from "@/store/shortcuts-store";

interface RequestHeaderProps {
  onShowCodeGen: () => void;
  onShowSearch: () => void;
}

export function RequestHeader({ onShowCodeGen, onShowSearch }: RequestHeaderProps) {
  const { tabs, activeTabId } = useTabStore();
  const { sendRequest, isLoading, cancelRequest } = useRequestStore();
  const { togglePanel: toggleShortcuts } = useShortcutsStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-[var(--text-secondary)]">{activeTab.collectionName}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium text-[var(--text-primary)]">{activeTab.name}</span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Environment Selector */}
        <EnvironmentSelector />

        {/* Code Generator */}
        <button
          type="button"
          onClick={onShowCodeGen}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          title="Generate Code (Ctrl+Shift+C)"
          aria-label="Generate code snippet"
        >
          <Code size={16} />
        </button>

        {/* Keyboard Shortcuts */}
        <button
          type="button"
          onClick={toggleShortcuts}
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          title="Keyboard Shortcuts (Ctrl+/)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard size={16} />
        </button>

        {/* Run / Cancel Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={cancelRequest}
            className="flex items-center gap-1.5 rounded bg-[var(--error)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-80"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" />
            </svg>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={sendRequest}
            className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Send
          </button>
        )}
      </div>
    </div>
  );
}
