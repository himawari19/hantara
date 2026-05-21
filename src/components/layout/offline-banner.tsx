"use client";

import { useEffect, useState } from "react";
import { useSyncStore } from "@/store/sync-store";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const { realtimeStatus, offlineQueue } = useSyncStore();
  const [showRecovered, setShowRecovered] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (realtimeStatus === "disconnected") {
      setWasOffline(true);
    } else if (realtimeStatus === "connected" && wasOffline) {
      setShowRecovered(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowRecovered(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [realtimeStatus, wasOffline]);

  // Show offline banner
  if (realtimeStatus === "disconnected") {
    return (
      <div className="flex items-center justify-center gap-2 bg-[var(--error)] px-3 py-1.5 text-xs text-white">
        <WifiOff size={12} />
        <span>
          You are offline.{" "}
          {offlineQueue.length > 0
            ? `${offlineQueue.length} change${offlineQueue.length > 1 ? "s" : ""} will sync when reconnected.`
            : "Changes will be saved locally."}
        </span>
      </div>
    );
  }

  // Show reconnecting banner
  if (realtimeStatus === "reconnecting") {
    return (
      <div className="flex items-center justify-center gap-2 bg-[var(--warning)] px-3 py-1.5 text-xs text-white">
        <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Reconnecting to sync server...</span>
      </div>
    );
  }

  // Show recovered banner briefly
  if (showRecovered) {
    return (
      <div className="flex items-center justify-center gap-2 bg-[var(--success)] px-3 py-1.5 text-xs text-white animate-in fade-in duration-200">
        <Wifi size={12} />
        <span>Connection restored. All changes synced.</span>
      </div>
    );
  }

  return null;
}
