"use client";

import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { EnvironmentSelector } from "../environment/environment-selector";

export function RequestHeader() {
  const { tabs, activeTabId } = useTabStore();
  const { sendRequest, isLoading } = useRequestStore();

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

        {/* Run Button */}
        <button
          type="button"
          onClick={sendRequest}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          Run
        </button>

        {/* Share Button */}
        <button
          type="button"
          className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          Share
        </button>

        {/* More Options */}
        <button
          type="button"
          className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="More options"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
