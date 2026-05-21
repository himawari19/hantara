"use client";

import { useEffect, useState } from "react";

/**
 * HydrationProvider - Prevents hydration mismatch with zustand persist.
 * 
 * Problem: Server renders with empty state, client has localStorage data.
 * Solution: Show nothing until client-side hydration is complete.
 */
export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--accent)]">Hantara</h1>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
