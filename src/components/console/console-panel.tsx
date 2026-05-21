"use client";

import { useRequestStore } from "@/store/request-store";
import { X, Trash2 } from "lucide-react";

interface ConsolePanelProps {
  onClose: () => void;
}

export function ConsolePanel({ onClose }: ConsolePanelProps) {
  const { consoleLogs, clearConsoleLogs } = useRequestStore();

  const typeColors: Record<string, string> = {
    info: "text-[var(--info)]",
    warn: "text-[var(--warning)]",
    error: "text-[var(--error)]",
    log: "text-[var(--text-primary)]",
  };

  return (
    <div className="flex h-48 flex-col border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        <span className="text-xs font-medium text-[var(--text-primary)]">
          Console ({consoleLogs.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clearConsoleLogs}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Clear console"
            title="Clear console"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Close console"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {consoleLogs.length === 0 ? (
          <p className="text-[var(--text-secondary)]">No logs yet. Send a request to see activity here.</p>
        ) : (
          consoleLogs.map((log, i) => (
            <div key={i} className={`flex items-start gap-2 py-0.5 ${typeColors[log.type]}`}>
              <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="shrink-0 w-10 text-[10px] uppercase opacity-70">[{log.type}]</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
