"use client";

import { useRequestStore } from "@/store/request-store";
import { useTabStore } from "@/store/tab-store";

export function OverviewTab() {
  const { method, url } = useRequestStore();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Request Info */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Request Overview</h3>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="grid grid-cols-[100px_1fr] gap-3 text-sm">
            <span className="text-[var(--text-secondary)]">Name</span>
            <span className="text-[var(--text-primary)]">{activeTab?.name || "Untitled"}</span>

            <span className="text-[var(--text-secondary)]">Method</span>
            <span className="font-mono text-[var(--text-primary)]">{method || "GET"}</span>

            <span className="text-[var(--text-secondary)]">URL</span>
            <span className="font-mono text-[var(--text-primary)]">{url || "—"}</span>

            <span className="text-[var(--text-secondary)]">Collection</span>
            <span className="text-[var(--text-primary)]">{activeTab?.collectionName || "—"}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Description</h3>
        <textarea
          placeholder="Add a description for this request..."
          className="min-h-[100px] resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>
    </div>
  );
}
