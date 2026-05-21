import { create } from "zustand";

export interface SyncEvent {
  id: string;
  type: "connected" | "disconnected" | "reconnecting" | "sync-success" | "sync-error" | "offline" | "online" | "conflict";
  message: string;
  timestamp: number;
}

interface SyncHealthState {
  events: SyncEvent[];
  latencyMs: number | null;
  lastPingAt: number | null;
  connectionUptime: number; // ms since last successful connect

  addEvent: (type: SyncEvent["type"], message: string) => void;
  setLatency: (ms: number) => void;
  setLastPing: (timestamp: number) => void;
  clearEvents: () => void;
}

export const useSyncHealthStore = create<SyncHealthState>((set) => ({
  events: [],
  latencyMs: null,
  lastPingAt: null,
  connectionUptime: 0,

  addEvent: (type, message) => {
    const event: SyncEvent = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now(),
    };
    set((s) => ({ events: [...s.events.slice(-49), event] })); // Keep last 50
  },

  setLatency: (ms) => set({ latencyMs: ms }),
  setLastPing: (timestamp) => set({ lastPingAt: timestamp }),
  clearEvents: () => set({ events: [] }),
}));
