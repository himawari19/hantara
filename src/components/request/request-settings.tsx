"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Request-level settings store
export interface RequestSettings {
  timeout: number; // ms, 0 = no timeout
  followRedirects: boolean;
  maxRedirects: number;
  verifySsl: boolean;
  proxy: {
    enabled: boolean;
    url: string;
  };
}

interface RequestSettingsState {
  settings: RequestSettings;
  setSettings: (settings: Partial<RequestSettings>) => void;
  setProxy: (proxy: Partial<RequestSettings["proxy"]>) => void;
}

export const useRequestSettingsStore = create<RequestSettingsState>()(
  persist(
    (set) => ({
      settings: {
        timeout: 0,
        followRedirects: true,
        maxRedirects: 5,
        verifySsl: true,
        proxy: { enabled: false, url: "" },
      },
      setSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
      setProxy: (proxy) =>
        set((state) => ({
          settings: { ...state.settings, proxy: { ...state.settings.proxy, ...proxy } },
        })),
    }),
    { name: "hantara-request-settings" }
  )
);

export function RequestSettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, setProxy } = useRequestSettingsStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Request Settings</h3>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Timeout */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-primary)]">Request Timeout</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.timeout}
                onChange={(e) => setSettings({ timeout: parseInt(e.target.value) || 0 })}
                className="w-24 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                min={0}
                aria-label="Timeout in milliseconds"
              />
              <span className="text-xs text-[var(--text-secondary)]">ms (0 = no timeout)</span>
            </div>
          </div>

          {/* Follow Redirects */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-medium text-[var(--text-primary)]">Follow Redirects</label>
              <p className="text-[10px] text-[var(--text-secondary)]">Automatically follow HTTP redirects</p>
            </div>
            <input
              type="checkbox"
              checked={settings.followRedirects}
              onChange={(e) => setSettings({ followRedirects: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
              aria-label="Follow redirects"
            />
          </div>

          {/* Max Redirects */}
          {settings.followRedirects && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-secondary)]">Max Redirects</label>
              <input
                type="number"
                value={settings.maxRedirects}
                onChange={(e) => setSettings({ maxRedirects: parseInt(e.target.value) || 5 })}
                className="w-20 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                min={1}
                max={20}
                aria-label="Maximum redirects"
              />
            </div>
          )}

          {/* SSL Verification */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-medium text-[var(--text-primary)]">SSL Certificate Verification</label>
              <p className="text-[10px] text-[var(--text-secondary)]">Verify SSL certificates</p>
            </div>
            <input
              type="checkbox"
              checked={settings.verifySsl}
              onChange={(e) => setSettings({ verifySsl: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
              aria-label="Verify SSL"
            />
          </div>

          {/* Proxy */}
          <div className="rounded border border-[var(--border)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text-primary)]">Proxy</label>
              <input
                type="checkbox"
                checked={settings.proxy.enabled}
                onChange={(e) => setProxy({ enabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
                aria-label="Enable proxy"
              />
            </div>
            {settings.proxy.enabled && (
              <input
                type="text"
                value={settings.proxy.url}
                onChange={(e) => setProxy({ url: e.target.value })}
                placeholder="http://proxy.example.com:8080"
                className="w-full rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
