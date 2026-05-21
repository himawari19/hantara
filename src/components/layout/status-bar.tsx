"use client";

import { useEnvironmentStore } from "@/store/environment-store";
import { useRequestStore } from "@/store/request-store";
import { useCookieStore } from "@/store/cookie-store";
import { useThemeStore } from "@/store/theme-store";
import { useSyncStore } from "@/store/sync-store";
import { Globe, Cookie, Terminal, Keyboard, Sun, Moon, Cloud, CloudOff, RefreshCw, Check } from "lucide-react";

interface StatusBarProps {
  onToggleConsole: () => void;
  showConsole: boolean;
}

export function StatusBar({ onToggleConsole, showConsole }: StatusBarProps) {
  const { environments, activeEnvironmentId } = useEnvironmentStore();
  const { isLoading, response, consoleLogs } = useRequestStore();
  const { cookies } = useCookieStore();
  const { theme, toggleTheme } = useThemeStore();
  const { status: syncStatus, lastSyncedAt, error: syncError } = useSyncStore();

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  const syncLabel = syncStatus === "syncing" ? "Syncing..." 
    : syncStatus === "synced" ? "Synced" 
    : syncStatus === "error" ? "Sync Error" 
    : "Idle";

  const syncColor = syncStatus === "syncing" ? "text-[var(--accent)]"
    : syncStatus === "synced" ? "text-[var(--success)]"
    : syncStatus === "error" ? "text-[var(--error)]"
    : "text-[var(--text-secondary)]";

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[10px]">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Environment */}
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Globe size={10} />
          <span>{activeEnv ? activeEnv.name : "No Environment"}</span>
        </div>

        {/* Cookies count */}
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Cookie size={10} />
          <span>{cookies.length} cookies</span>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-1 text-[var(--accent)]">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Sending...</span>
          </div>
        )}

        {/* Last response status */}
        {!isLoading && response && (
          <span className={`font-medium ${
            response.status >= 200 && response.status < 300
              ? "text-[var(--success)]"
              : response.status >= 400
              ? "text-[var(--error)]"
              : "text-[var(--warning)]"
          }`}>
            {response.status} • {response.time}ms
          </span>
        )}

        {/* Sync status indicator */}
        <div className={`flex items-center gap-1 ${syncColor}`} title={syncError || syncLabel}>
          {syncStatus === "syncing" && <RefreshCw size={10} className="animate-spin" />}
          {syncStatus === "synced" && <Check size={10} />}
          {syncStatus === "error" && <CloudOff size={10} />}
          {syncStatus === "idle" && <Cloud size={10} />}
          <span>{syncLabel}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Console toggle */}
        <button
          type="button"
          onClick={onToggleConsole}
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${
            showConsole ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
          title="Toggle Console (Ctrl+`)"
        >
          <Terminal size={10} />
          <span>Console</span>
          {consoleLogs.length > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1 text-[8px] text-white">
              {consoleLogs.length}
            </span>
          )}
        </button>

        {/* Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title="Toggle theme"
        >
          {theme === "dark" ? <Moon size={10} /> : <Sun size={10} />}
        </button>

        {/* Shortcuts hint */}
        <span className="text-[var(--text-secondary)]">
          <Keyboard size={10} className="inline" /> Ctrl+/ for shortcuts
        </span>
      </div>
    </div>
  );
}
