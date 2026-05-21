"use client";

import { useEffect, useState } from "react";
import { migrateLocalStorageToIDB } from "@/lib/idb-storage";

/**
 * HydrationProvider - Prevents hydration mismatch with zustand persist.
 * 
 * Problem: Server renders with empty state, client has localStorage data.
 * Solution: Show skeleton layout until client-side hydration is complete.
 */
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Migrate localStorage → IndexedDB on first load (no-op if already done)
    migrateLocalStorageToIDB().finally(() => {
      setHydrated(true);
    });
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
        {/* Skeleton mimics the actual app layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar skeleton */}
          <div className="flex w-72 flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="h-5 w-20 animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-5 w-5 animate-pulse rounded bg-[var(--bg-tertiary)]" />
            </div>
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-[var(--bg-tertiary)]" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-[var(--bg-tertiary)]" style={{ animationDelay: `${i * 100}ms` }} />
                </div>
              ))}
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="flex flex-1 flex-col">
            {/* Tab bar */}
            <div className="flex h-9 items-center gap-1 border-b border-[var(--border)] px-2">
              <div className="h-6 w-32 animate-pulse rounded bg-[var(--bg-tertiary)]" />
            </div>
            {/* URL bar */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
              <div className="h-8 w-20 animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-8 flex-1 animate-pulse rounded bg-[var(--bg-tertiary)]" />
              <div className="h-8 w-16 animate-pulse rounded bg-[var(--accent)]/20" />
            </div>
            {/* Content area */}
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <h1 className="text-xl font-bold text-[var(--accent)]">Hantara</h1>
                <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-[var(--accent)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Status bar */}
        <div className="h-6 border-t border-[var(--border)] bg-[var(--bg-secondary)]" />
      </div>
    );
  }

  return <>{children}</>;
}
