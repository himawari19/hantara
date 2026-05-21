import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface RequestSnapshot {
  id: string;
  requestId: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: string;
  authType: string;
  authConfig: Record<string, string>;
  timestamp: number;
  label?: string;
}

interface VersionState {
  snapshots: Record<string, RequestSnapshot[]>; // keyed by requestId
  maxSnapshots: number;

  saveSnapshot: (requestId: string, data: Omit<RequestSnapshot, "id" | "timestamp">) => void;
  getSnapshots: (requestId: string) => RequestSnapshot[];
  removeSnapshot: (requestId: string, snapshotId: string) => void;
  clearSnapshots: (requestId: string) => void;
  labelSnapshot: (requestId: string, snapshotId: string, label: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useVersionStore = create<VersionState>()(
  persist(
    (set, get) => ({
      snapshots: {},
      maxSnapshots: 50,

      saveSnapshot: (requestId, data) => {
        const snapshot: RequestSnapshot = {
          ...data,
          id: generateId(),
          requestId,
          timestamp: Date.now(),
        };

        set((state) => {
          const existing = state.snapshots[requestId] || [];
          // Check if content actually changed from last snapshot
          const last = existing[0];
          if (last && last.url === data.url && last.body === data.body &&
              last.method === data.method && JSON.stringify(last.headers) === JSON.stringify(data.headers)) {
            return state; // No change, skip
          }

          const updated = [snapshot, ...existing].slice(0, state.maxSnapshots);
          return { snapshots: { ...state.snapshots, [requestId]: updated } };
        });
      },

      getSnapshots: (requestId) => {
        return get().snapshots[requestId] || [];
      },

      removeSnapshot: (requestId, snapshotId) => {
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [requestId]: (state.snapshots[requestId] || []).filter((s) => s.id !== snapshotId),
          },
        }));
      },

      clearSnapshots: (requestId) => {
        set((state) => ({
          snapshots: { ...state.snapshots, [requestId]: [] },
        }));
      },

      labelSnapshot: (requestId, snapshotId, label) => {
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [requestId]: (state.snapshots[requestId] || []).map((s) =>
              s.id === snapshotId ? { ...s, label } : s
            ),
          },
        }));
      },
    }),
    { name: "hantara-versions", storage: idbStorage }
  )
);
