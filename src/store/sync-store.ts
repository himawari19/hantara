import { create } from "zustand";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  retryCount: number;
  pendingChanges: number;

  setStatus: (status: SyncStatus) => void;
  setSynced: () => void;
  setError: (error: string) => void;
  incrementPending: () => void;
  resetPending: () => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  lastSyncedAt: null,
  error: null,
  retryCount: 0,
  pendingChanges: 0,

  setStatus: (status) => set({ status, error: status === "syncing" ? null : undefined }),
  setSynced: () => set({ status: "synced", lastSyncedAt: Date.now(), error: null, retryCount: 0, pendingChanges: 0 }),
  setError: (error) => set({ status: "error", error }),
  incrementPending: () => set((s) => ({ pendingChanges: s.pendingChanges + 1 })),
  resetPending: () => set({ pendingChanges: 0 }),
  incrementRetry: () => set((s) => ({ retryCount: s.retryCount + 1 })),
  resetRetry: () => set({ retryCount: 0 }),
}));
