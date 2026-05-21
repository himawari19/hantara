"use client";

import { useState } from "react";
import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { useCollectionStore } from "@/store/collection-store";
import { useSyncStore } from "@/store/sync-store";
import { useRequestHistoryStore } from "@/store/request-history-store";
import { EnvironmentSelector } from "../environment/environment-selector";
import { RevertDialog } from "../request/revert-dialog";
import { SaveAsDialog } from "../request/save-as-dialog";
import { Code, Keyboard, Cloud, CloudOff, Check, Loader2, Undo2, Copy } from "lucide-react";
import { useShortcutsStore } from "@/store/shortcuts-store";

interface RequestHeaderProps {
  onShowCodeGen: () => void;
  onShowSearch: () => void;
}

export function RequestHeader({ onShowCodeGen, onShowSearch }: RequestHeaderProps) {
  const { tabs, activeTabId } = useTabStore();
  const { togglePanel: toggleShortcuts } = useShortcutsStore();
  const { status: syncStatus } = useSyncStore();
  const activeRequestId = useCollectionStore((s) => s.activeRequestId);

  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) return null;

  const handleQuickRevert = () => {
    if (!activeRequestId) return;
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

    if (activeTabId) {
      useTabStore.getState().markDirty(activeTabId, false);
    }
  };

  const canRevert = activeTab.isDirty && activeRequestId &&
    useRequestHistoryStore.getState().getSnapshot(activeRequestId);

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-[var(--text-secondary)]">{activeTab.collectionName}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <span className="font-medium text-[var(--text-primary)]">{activeTab.name}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sync Status Indicator */}
          <div className="hidden items-center gap-1 text-[10px] sm:flex" title={
            syncStatus === "syncing" ? "Saving changes... (Ctrl+S to force)" :
            syncStatus === "synced" ? "All changes saved" :
            syncStatus === "error" ? "Failed to save — will retry" : "Ready"
          }>
            {syncStatus === "syncing" && (
              <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                <Loader2 size={12} className="animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {syncStatus === "synced" && (
              <span className="flex items-center gap-1 text-[var(--success)]">
                <Check size={12} />
                <span>Saved</span>
              </span>
            )}
            {syncStatus === "error" && (
              <span className="flex items-center gap-1 text-[var(--error)]">
                <CloudOff size={12} />
                <span>Error</span>
              </span>
            )}
            {syncStatus === "idle" && activeTab.isDirty && (
              <span className="flex items-center gap-1 text-[var(--warning)]">
                <Cloud size={12} />
                <span>Unsaved</span>
              </span>
            )}
          </div>

          {/* Revert Button - only show when dirty */}
          {canRevert && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleQuickRevert}
                className="flex items-center gap-1 rounded-l px-2 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border-r border-[var(--border)] sm:px-2.5"
                title="Revert to last saved state"
                aria-label="Revert changes"
              >
                <Undo2 size={12} />
                <span>Revert</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRevertDialog(true)}
                className="rounded-r px-2 py-1.5 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                title="View changes before reverting"
                aria-label="View diff"
              >
                ▾
              </button>
            </div>
          )}

          {/* Save As New Request */}
          <button
            type="button"
            onClick={() => setShowSaveAsDialog(true)}
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Save as new request (Ctrl+Shift+S)"
            aria-label="Save as new request"
          >
            <Copy size={16} />
          </button>

          {/* Environment Selector */}
          <EnvironmentSelector />

          {/* Code Generator */}
          <button
            type="button"
            onClick={onShowCodeGen}
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Generate Code (Ctrl+Shift+C)"
            aria-label="Generate code snippet"
          >
            <Code size={16} />
          </button>

          {/* Keyboard Shortcuts */}
          <button
            type="button"
            onClick={toggleShortcuts}
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Keyboard Shortcuts (Ctrl+/)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={16} />
          </button>


        </div>
      </div>

      {/* Dialogs */}
      <RevertDialog isOpen={showRevertDialog} onClose={() => setShowRevertDialog(false)} />
      <SaveAsDialog isOpen={showSaveAsDialog} onClose={() => setShowSaveAsDialog(false)} />
    </>
  );
}
