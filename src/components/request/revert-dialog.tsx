"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";
import { useCollectionStore } from "@/store/collection-store";
import { useRequestHistoryStore, DiffEntry } from "@/store/request-history-store";
import { useTabStore } from "@/store/tab-store";
import { Undo2, X, ArrowRight } from "lucide-react";

interface RevertDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RevertDialog({ isOpen, onClose }: RevertDialogProps) {
  const activeRequestId = useCollectionStore((s) => s.activeRequestId);

  if (!isOpen || !activeRequestId) return null;

  const { method, url, headers, body, bodyType, preScript, testScript } = useRequestStore.getState();
  const current = { method, url, headers, body, bodyType, preScript, testScript };
  const diffs = useRequestHistoryStore.getState().getDiff(activeRequestId, current);

  const handleRevert = () => {
    const snapshot = useRequestHistoryStore.getState().getSnapshot(activeRequestId);
    if (!snapshot) return;

    const reqStore = useRequestStore.getState();
    reqStore.setMethod(snapshot.method as any);
    reqStore.setUrl(snapshot.url);
    reqStore.setHeaders(snapshot.headers);
    reqStore.setBody(snapshot.body);
    reqStore.setBodyType(snapshot.bodyType as any);
    reqStore.setPreScript(snapshot.preScript);
    reqStore.setTestScript(snapshot.testScript);

    const activeTabId = useTabStore.getState().activeTabId;
    if (activeTabId) {
      useTabStore.getState().markDirty(activeTabId, false);
    }

    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Undo2 size={16} className="text-[var(--warning)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Revert Changes</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto p-4">
            {diffs.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No changes to revert.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  The following changes will be reverted:
                </p>
                {diffs.map((diff) => (
                  <DiffRow key={diff.field} diff={diff} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevert}
              disabled={diffs.length === 0}
              className="flex items-center gap-1.5 rounded bg-[var(--warning)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              <Undo2 size={12} />
              Revert All
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DiffRow({ diff }: { diff: DiffEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = diff.oldValue.length > 60 || diff.newValue.length > 60;

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-2.5">
      <button
        type="button"
        onClick={() => isLong && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-[10px] font-medium uppercase text-[var(--text-secondary)]">
          {diff.label}
        </span>
      </button>

      <div className={`mt-1.5 flex ${isLong && !expanded ? "flex-col" : "items-center"} gap-1.5`}>
        {/* Old value */}
        <div className={`rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 ${isLong && !expanded ? "truncate" : ""}`}>
          <span className="mr-1 text-[10px] opacity-60">−</span>
          {isLong && !expanded ? diff.oldValue.slice(0, 50) + "..." : diff.oldValue}
        </div>

        <ArrowRight size={10} className="shrink-0 text-[var(--text-secondary)]" />

        {/* New value */}
        <div className={`rounded bg-green-500/10 px-2 py-1 text-xs text-green-400 ${isLong && !expanded ? "truncate" : ""}`}>
          <span className="mr-1 text-[10px] opacity-60">+</span>
          {isLong && !expanded ? diff.newValue.slice(0, 50) + "..." : diff.newValue}
        </div>
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-[10px] text-[var(--accent)] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
