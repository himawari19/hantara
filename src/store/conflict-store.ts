import { create } from "zustand";

export interface ConflictInfo {
  requestId: string;
  requestName: string;
  localChanges: string[];
  remoteChanges: string[];
  timestamp?: number;
}

interface ConflictState {
  conflict: ConflictInfo | null;
  isOpen: boolean;
  queue: ConflictInfo[];

  showConflict: (conflict: ConflictInfo) => void;
  dismiss: () => void;
  enqueueConflict: (conflict: ConflictInfo) => void;
  resolveNext: () => void;
  resolveAll: (action: "keep-local" | "take-remote") => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  conflict: null,
  isOpen: false,
  queue: [],

  showConflict: (conflict) => set({ conflict, isOpen: true }),

  dismiss: () => {
    const { queue } = get();
    if (queue.length > 0) {
      // Show next conflict from queue
      const [next, ...rest] = queue;
      set({ conflict: next, isOpen: true, queue: rest });
    } else {
      set({ conflict: null, isOpen: false });
    }
  },

  enqueueConflict: (conflict) => {
    const state = get();
    const conflictWithTimestamp = { ...conflict, timestamp: Date.now() };
    if (!state.isOpen) {
      // No active conflict, show immediately
      set({ conflict: conflictWithTimestamp, isOpen: true });
    } else {
      // Already showing a conflict, add to queue
      set((s) => ({ queue: [...s.queue, conflictWithTimestamp] }));
    }
  },

  resolveNext: () => {
    const { queue } = get();
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      set({ conflict: next, isOpen: true, queue: rest });
    } else {
      set({ conflict: null, isOpen: false });
    }
  },

  resolveAll: (_action) => {
    set({ conflict: null, isOpen: false, queue: [] });
  },
}));
