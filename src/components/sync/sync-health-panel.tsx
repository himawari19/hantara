"use client";

import { useSyncStore } from "@/store/sync-store";
import { useSyncHealthStore, SyncEvent } from "@/store/sync-health-store";
import { X, Wifi, WifiOff, Radio, RefreshCw, Check, AlertTriangle, Trash2 } from "lucide-react";

interface SyncHealthPanelProps {
  onClose: () => void;
}

export function SyncHealthPanel({ onClose }: SyncHealthPanelProps) {
  const { realtimeStatus, realtimeRetryCount, offlineQueue, isLeaderTab, lastSyncedAt } = useSyncStore();
  const { events, latencyMs, lastPingAt, clearEvents } = useSyncHealthStore();

  const statusIcon = {
    connected: <Wifi size={14} className="text-[var(--success)]" />,
    connecting: <Radio size={14} className="text-[var(--accent)] animate-pulse" />,
    reconnecting: <Radio size={14} className="text-[var(--warning)] animate-pulse" />,
    disconnected: <WifiOff size={14} className="text-[var(--error)]" />,
  };

  const statusLabel = {
    connected: "Connected",
    connecting: "Connecting...",
    reconnecting: "Reconnecting...",
    disconnected: "Disconnected",
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-[500px] max-h-[600px] flex flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Sync Health</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 border-b border-[var(--border)] p-4">
          <StatCard
            label="Realtime"
            value={statusLabel[realtimeStatus]}
            icon={statusIcon[realtimeStatus]}
          />
          <StatCard
            label="Latency"
            value={latencyMs !== null ? `${latencyMs}ms` : "—"}
            icon={<RefreshCw size={14} className="text-[var(--text-secondary)]" />}
          />
          <StatCard
            label="Queue"
            value={`${offlineQueue.length} pending`}
            icon={offlineQueue.length > 0
              ? <AlertTriangle size={14} className="text-[var(--warning)]" />
              : <Check size={14} className="text-[var(--success)]" />
            }
          />
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-2 text-[10px] text-[var(--text-secondary)]">
          <span>Role: {isLeaderTab ? "Leader" : "Follower"}</span>
          <span>Retries: {realtimeRetryCount}</span>
          <span>Last sync: {lastSyncedAt ? formatTime(lastSyncedAt) : "Never"}</span>
          <span>Last ping: {lastPingAt ? formatTime(lastPingAt) : "—"}</span>
        </div>

        {/* Event log */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">Event Log ({events.length})</span>
          <button
            type="button"
            onClick={clearEvents}
            className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Trash2 size={10} />
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-[var(--text-secondary)]">
              No events recorded yet
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {[...events].reverse().map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--bg-secondary)] p-2">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[10px] text-[var(--text-secondary)]">{label}</span>
      </div>
      <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function EventRow({ event }: { event: SyncEvent }) {
  const colorMap: Record<SyncEvent["type"], string> = {
    connected: "text-[var(--success)]",
    disconnected: "text-[var(--error)]",
    reconnecting: "text-[var(--warning)]",
    "sync-success": "text-[var(--success)]",
    "sync-error": "text-[var(--error)]",
    offline: "text-[var(--error)]",
    online: "text-[var(--success)]",
    conflict: "text-[var(--warning)]",
  };

  const iconMap: Record<SyncEvent["type"], React.ReactNode> = {
    connected: <Wifi size={10} />,
    disconnected: <WifiOff size={10} />,
    reconnecting: <Radio size={10} />,
    "sync-success": <Check size={10} />,
    "sync-error": <AlertTriangle size={10} />,
    offline: <WifiOff size={10} />,
    online: <Wifi size={10} />,
    conflict: <AlertTriangle size={10} />,
  };

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[var(--bg-secondary)]">
      <span className={colorMap[event.type]}>{iconMap[event.type]}</span>
      <span className="flex-1 text-[10px] text-[var(--text-primary)]">{event.message}</span>
      <span className="text-[9px] text-[var(--text-secondary)]">{formatTime(event.timestamp)}</span>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
