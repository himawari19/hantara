import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export type RealtimeStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  retryCount: number;
  pendingChanges: number;

  // Realtime connection state
  realtimeStatus: RealtimeStatus;
  realtimeRetryCount: number;
  isLeaderTab: boolean;

  // Offline queue
  offlineQueue: OfflineChange[];

  setStatus: (status: SyncStatus) => void;
  setSynced: () => void;
  setError: (error: string) => void;
  incrementPending: () => void;
  resetPending: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;

  // Realtime actions
  setRealtimeStatus: (status: RealtimeStatus) => void;
  incrementRealtimeRetry: () => void;
  resetRealtimeRetry: () => void;
  setIsLeaderTab: (isLeader: boolean) => void;

  // Offline queue actions
  enqueueOfflineChange: (change: OfflineChange) => void;
  clearOfflineQueue: () => void;
}

export interface OfflineChange {
  id: string;
  domain: string;
  timestamp: number;
  data: any;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastSyncedAt: null,
  error: null,
  retryCount: 0,
  pendingChanges: 0,

  realtimeStatus: "disconnected",
  realtimeRetryCount: 0,
  isLeaderTab: true,

  offlineQueue: [],

  setStatus: (status) => set({ status, error: status === "syncing" ? null : undefined }),
  setSynced: () => set({ status: "synced", lastSyncedAt: Date.now(), error: null, retryCount: 0, pendingChanges: 0 }),
  setError: (error) => set({ status: "error", error }),
  incrementPending: () => set((s) => ({ pendingChanges: s.pendingChanges + 1 })),
  resetPending: () => set({ pendingChanges: 0 }),
  incrementRetry: () => set((s) => ({ retryCount: s.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0 }),

  setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),
  incrementRealtimeRetry: () => set((s) => ({ realtimeRetryCount: s.realtimeRetryCount + 1 })),
  resetRealtimeRetry: () => set({ realtimeRetryCount: 0 }),
  setIsLeaderTab: (isLeaderTab) => set({ isLeaderTab }),

  enqueueOfflineChange: (change) => set((s) => ({ offlineQueue: [...s.offlineQueue, change] })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),
}));
