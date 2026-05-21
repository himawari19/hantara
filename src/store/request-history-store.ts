import { create } from "zustand";

/**
 * Request Edit History Store
 * - Multi-level undo (up to 30 steps per request)
 * - Last saved snapshot for "Revert to saved"
 * - Diff computation between current and saved state
 */

export interface RequestSnapshot {
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: string;
  preScript: string;
  testScript: string;
  timestamp?: number;
}

export interface DiffEntry {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

const MAX_UNDO_STEPS = 30;

interface RequestHistoryState {
  // Last saved/synced state per request
  savedSnapshots: Record<string, RequestSnapshot>;
  // Undo stack per request (most recent at end)
  undoStacks: Record<string, RequestSnapshot[]>;
  // Redo stack per request
  redoStacks: Record<string, RequestSnapshot[]>;

  // Actions
  saveSnapshot: (requestId: string, snapshot: RequestSnapshot) => void;
  getSnapshot: (requestId: string) => RequestSnapshot | null;
  clearSnapshot: (requestId: string) => void;

  // Undo/Redo
  pushUndo: (requestId: string, snapshot: RequestSnapshot) => void;
  undo: (requestId: string) => RequestSnapshot | null;
  redo: (requestId: string) => RequestSnapshot | null;
  canUndo: (requestId: string) => boolean;
  canRedo: (requestId: string) => boolean;
  clearHistory: (requestId: string) => void;

  // Diff
  getDiff: (requestId: string, current: RequestSnapshot) => DiffEntry[];
}

export const useRequestHistoryStore = create<RequestHistoryState>((set, get) => ({
  savedSnapshots: {},
  undoStacks: {},
  redoStacks: {},

  saveSnapshot: (requestId, snapshot) => {
    set((state) => ({
      savedSnapshots: {
        ...state.savedSnapshots,
        [requestId]: { ...snapshot, timestamp: Date.now() },
      },
    }));
  },

  getSnapshot: (requestId) => {
    return get().savedSnapshots[requestId] || null;
  },

  clearSnapshot: (requestId) => {
    set((state) => {
      const { [requestId]: _, ...rest } = state.savedSnapshots;
      return { savedSnapshots: rest };
    });
  },

  pushUndo: (requestId, snapshot) => {
    set((state) => {
      const stack = state.undoStacks[requestId] || [];
      const newStack = [...stack, { ...snapshot, timestamp: Date.now() }].slice(-MAX_UNDO_STEPS);
      return {
        undoStacks: { ...state.undoStacks, [requestId]: newStack },
        // Clear redo on new action
        redoStacks: { ...state.redoStacks, [requestId]: [] },
      };
    });
  },

  undo: (requestId) => {
    const { undoStacks, redoStacks } = get();
    const stack = undoStacks[requestId] || [];
    if (stack.length === 0) return null;

    const snapshot = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);

    // We need current state for redo — caller should push current to redo before applying
    set((state) => ({
      undoStacks: { ...state.undoStacks, [requestId]: newStack },
    }));

    return snapshot;
  },

  redo: (requestId) => {
    const { redoStacks } = get();
    const stack = redoStacks[requestId] || [];
    if (stack.length === 0) return null;

    const snapshot = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);

    set((state) => ({
      redoStacks: { ...state.redoStacks, [requestId]: newStack },
    }));

    return snapshot;
  },

  canUndo: (requestId) => {
    return (get().undoStacks[requestId] || []).length > 0;
  },

  canRedo: (requestId) => {
    return (get().redoStacks[requestId] || []).length > 0;
  },

  clearHistory: (requestId) => {
    set((state) => ({
      undoStacks: { ...state.undoStacks, [requestId]: [] },
      redoStacks: { ...state.redoStacks, [requestId]: [] },
    }));
  },

  getDiff: (requestId, current) => {
    const saved = get().savedSnapshots[requestId];
    if (!saved) return [];

    const diffs: DiffEntry[] = [];

    if (current.method !== saved.method) {
      diffs.push({ field: "method", label: "Method", oldValue: saved.method, newValue: current.method });
    }
    if (current.url !== saved.url) {
      diffs.push({ field: "url", label: "URL", oldValue: saved.url, newValue: current.url });
    }
    if (current.body !== saved.body) {
      diffs.push({ field: "body", label: "Body", oldValue: saved.body || "(empty)", newValue: current.body || "(empty)" });
    }
    if (current.bodyType !== saved.bodyType) {
      diffs.push({ field: "bodyType", label: "Body Type", oldValue: saved.bodyType, newValue: current.bodyType });
    }
    if (current.preScript !== saved.preScript) {
      diffs.push({ field: "preScript", label: "Pre-request Script", oldValue: saved.preScript || "(empty)", newValue: current.preScript || "(empty)" });
    }
    if (current.testScript !== saved.testScript) {
      diffs.push({ field: "testScript", label: "Test Script", oldValue: saved.testScript || "(empty)", newValue: current.testScript || "(empty)" });
    }
    if (JSON.stringify(current.headers) !== JSON.stringify(saved.headers)) {
      const oldHeaders = saved.headers.filter((h) => h.key.trim()).map((h) => `${h.key}: ${h.value}`).join("\n") || "(none)";
      const newHeaders = current.headers.filter((h) => h.key.trim()).map((h) => `${h.key}: ${h.value}`).join("\n") || "(none)";
      diffs.push({ field: "headers", label: "Headers", oldValue: oldHeaders, newValue: newHeaders });
    }

    return diffs;
  },
}));
