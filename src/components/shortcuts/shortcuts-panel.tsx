"use client";

import { useShortcutsStore, defaultShortcuts } from "@/store/shortcuts-store";
import { X } from "lucide-react";

export function ShortcutsPanel() {
  const { togglePanel } = useShortcutsStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={togglePanel}>
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
          <button
            type="button"
            onClick={togglePanel}
            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close shortcuts panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {defaultShortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between rounded px-3 py-2 hover:bg-[var(--bg-tertiary)]"
            >
              <span className="text-sm text-[var(--text-primary)]">{shortcut.label}</span>
              <kbd className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 font-mono text-xs text-[var(--text-secondary)]">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
