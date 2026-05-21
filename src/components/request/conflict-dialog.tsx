"use client";

import { X, CloudDownload, Upload, GitMerge } from "lucide-react";
import { useConflictStore } from "@/store/conflict-store";

export interface ConflictData {
  requestId: string;
  requestName: string;
  localChanges: string[];
  remoteChanges: string[];
}

interface ConflictDialogProps {
  isOpen: boolean;
  conflict: ConflictData | null;
  onKeepLocal: () => void;
  onTakeRemote: () => void;
  onClose: () => void;
}

export function ConflictDialog({ isOpen, conflict, onKeepLocal, onTakeRemote, onClose }: ConflictDialogProps) {
  const queueLength = useConflictStore((s) => s.queue.length);

  if (!isOpen || !conflict) return null;

  const handleKeepAllLocal = () => {
    useConflictStore.getState().resolveAll("keep-local");
    onKeepLocal();
  };

  const handleTakeAllRemote = () => {
    useConflictStore.getState().resolveAll("take-remote");
    onTakeRemote();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <GitMerge size={16} className="text-[var(--warning)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Sync Conflict</h3>
              {queueLength > 0 && (
                <span className="rounded-full bg-[var(--warning)] px-1.5 py-0.5 text-[9px] font-medium text-white">
                  +{queueLength} more
                </span>
              )}
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
          <div className="p-4">
            <p className="mb-3 text-sm text-[var(--text-primary)]">
              <span className="font-medium">{conflict.requestName}</span> was modified on another device while you were editing it.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Local changes */}
              <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                  <Upload size={12} />
                  Your Changes
                </div>
                {conflict.localChanges.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {conflict.localChanges.map((change, i) => (
                      <li key={i} className="text-[11px] text-green-400">+ {change}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">No local changes</p>
                )}
              </div>

              {/* Remote changes */}
              <div className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                  <CloudDownload size={12} />
                  Remote Changes
                </div>
                {conflict.remoteChanges.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {conflict.remoteChanges.map((change, i) => (
                      <li key={i} className="text-[11px] text-blue-400">~ {change}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">No remote changes</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            {/* Resolve All (only show when queue has items) */}
            <div>
              {queueLength > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleKeepAllLocal}
                    className="rounded px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Keep all mine ({queueLength + 1})
                  </button>
                  <button
                    type="button"
                    onClick={handleTakeAllRemote}
                    className="rounded px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    Take all remote ({queueLength + 1})
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Decide Later
              </button>
              <button
                type="button"
                onClick={onTakeRemote}
                className="flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                <CloudDownload size={12} />
                Take Remote
              </button>
              <button
                type="button"
                onClick={onKeepLocal}
                className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <Upload size={12} />
                Keep Mine
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
