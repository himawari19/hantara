"use client";

import { useEffect, useRef } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { useFlowStore } from "@/store/flow-store";
import { useMockStore } from "@/store/mock-store";
import { useCookieStore } from "@/store/cookie-store";
import { useRequestStore } from "@/store/request-store";
import { useResponseStore } from "@/store/response-store";
import { cacheResponse, getCachedResponse } from "@/lib/response-cache";
import {
  loadAllFromSupabase,
  loadFromSupabase,
  scheduleSyncToSupabase,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  migrateLocalStorageIds,
  markDirty,
  getIsSyncingFromRemote,
  setConflictCallback,
} from "@/lib/supabase/sync";
import { useTabStore } from "@/store/tab-store";
import { useSyncStore } from "@/store/sync-store";
import { useRequestHistoryStore } from "@/store/request-history-store";
import { useConflictStore } from "@/store/conflict-store";
import { ConflictDialog } from "@/components/request/conflict-dialog";

/**
 * SyncProvider (No Auth)
 * 
 * Strategy:
 * 1. On mount: migrate old IDs, load from Supabase if empty, restore active request
 * 2. On store change: debounced partial sync to Supabase (via zustand subscribe, NOT React re-renders)
 * 3. Realtime subscription for multi-device sync
 * 4. Auto-persist request edits to collection store
 * 5. Unsaved changes warning on browser close
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const initialLoadDone = useRef(false);
  const isSyncingFromRemoteRef = useRef(false);
  const persistTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load + migration + realtime + restore
  useEffect(() => {
    async function init() {
      migrateLocalStorageIds();

      const localCollections = useCollectionStore.getState().collections;
      if (localCollections.length === 0) {
        isSyncingFromRemoteRef.current = true;
        await loadAllFromSupabase();
        setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 3000);
      }

      // Set up conflict detection callback
      setConflictCallback((payload) => {
        const activeRequestId = useCollectionStore.getState().activeRequestId;
        if (!activeRequestId) return;

        const request = findRequestInCollections(
          useCollectionStore.getState().collections,
          activeRequestId
        );

        const { method, url, body } = useRequestStore.getState();
        const localChanges: string[] = [];
        if (request && method !== request.method) localChanges.push(`Method: ${request.method} → ${method}`);
        if (request && url !== request.url) localChanges.push(`URL changed`);
        if (request && body !== request.body) localChanges.push(`Body modified`);

        useConflictStore.getState().enqueueConflict({
          requestId: activeRequestId,
          requestName: request?.name || "Request",
          localChanges,
          remoteChanges: [`${payload.table} ${payload.eventType}`],
        });
      });

      restoreActiveRequest();
      subscribeToRealtime();
      initialLoadDone.current = true;
    }

    init();
    return () => {
      unsubscribeFromRealtime();
      setConflictCallback(null);
    };
  }, []);

  // Auto-persist request edits → collection store (via subscribe, no re-renders)
  useEffect(() => {
    let prevData = getRequestSyncData();
    let undoDebounce: ReturnType<typeof setTimeout> | null = null;

    const unsub = useRequestStore.subscribe(() => {
      if (!initialLoadDone.current) return;
      if (getIsSyncingFromRemote() || isSyncingFromRemoteRef.current) {
        prevData = getRequestSyncData();
        return;
      }

      const curr = getRequestSyncData();
      const changed = curr.method !== prevData.method || curr.url !== prevData.url ||
        curr.headers !== prevData.headers || curr.body !== prevData.body ||
        curr.bodyType !== prevData.bodyType || curr.preScript !== prevData.preScript ||
        curr.testScript !== prevData.testScript || curr.formData !== prevData.formData;

      if (!changed) return;

      const activeRequestId = useCollectionStore.getState().activeRequestId;
      if (!activeRequestId) {
        prevData = curr;
        return;
      }

      // Push previous state to undo stack (debounced to batch rapid changes)
      if (undoDebounce) clearTimeout(undoDebounce);
      const prevSnapshot = { ...prevData };
      undoDebounce = setTimeout(() => {
        useRequestHistoryStore.getState().pushUndo(activeRequestId, {
          method: prevSnapshot.method,
          url: prevSnapshot.url,
          headers: prevSnapshot.headers,
          body: prevSnapshot.body,
          bodyType: prevSnapshot.bodyType,
          preScript: prevSnapshot.preScript,
          testScript: prevSnapshot.testScript,
        });
      }, 1500);

      prevData = curr;

      // Mark tab dirty immediately
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId) {
        useTabStore.getState().markDirty(activeTabId, true);
      }

      // Debounce persist to collection store
      if (persistTimeout.current) clearTimeout(persistTimeout.current);
      persistTimeout.current = setTimeout(() => {
        const { method, url, headers, body, bodyType, preScript, testScript } = useRequestStore.getState();
        useCollectionStore.getState().updateRequest(activeRequestId, {
          method, url, headers, body, bodyType, preScript, testScript,
        });
      }, 800);
    });

    return unsub;
  }, []);

  // Sync domain stores to Supabase (via subscribe, no re-renders)
  useEffect(() => {
    const stores = [
      { store: useCollectionStore, key: "collections" as const, selector: (s: any) => s.collections },
      { store: useEnvironmentStore, key: "environments" as const, selector: (s: any) => s.environments },
      { store: useFlowStore, key: "flows" as const, selector: (s: any) => s.flows },
      { store: useMockStore, key: "mocks" as const, selector: (s: any) => s.servers },
      { store: useCookieStore, key: "cookies" as const, selector: (s: any) => s.cookies },
      { store: useRequestStore, key: "history" as const, selector: (s: any) => s.history },
    ];

    const prevValues = new Map(stores.map(({ key, store, selector }) => [key, selector(store.getState())]));

    const unsubs = stores.map(({ store, key, selector }) =>
      store.subscribe((state: any) => {
        if (!initialLoadDone.current) return;
        if (getIsSyncingFromRemote() || isSyncingFromRemoteRef.current) {
          prevValues.set(key, selector(state));
          return;
        }

        const current = selector(state);
        if (current !== prevValues.get(key)) {
          prevValues.set(key, current);
          markDirty(key);
          scheduleSyncToSupabase();
        }
      })
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  // Tab switching — load request data when switching tabs
  useEffect(() => {
    let prevTabId = useTabStore.getState().activeTabId;

    const unsub = useTabStore.subscribe((state) => {
      if (!initialLoadDone.current) return;
      if (state.activeTabId === prevTabId) return;
      prevTabId = state.activeTabId;

      if (!state.activeTabId) return;

      const tab = state.tabs.find((t) => t.id === state.activeTabId);
      if (!tab) return;

      // Flush pending persist for previous tab before switching
      if (persistTimeout.current) {
        clearTimeout(persistTimeout.current);
        persistTimeout.current = null;
        const prevRequestId = useCollectionStore.getState().activeRequestId;
        if (prevRequestId) {
          const { method, url, headers, body, bodyType, preScript, testScript } = useRequestStore.getState();
          useCollectionStore.getState().updateRequest(prevRequestId, {
            method, url, headers, body, bodyType, preScript, testScript,
          });
        }
      }

      // Load new tab's request data
      isSyncingFromRemoteRef.current = true;
      const request = findRequestInCollections(
        useCollectionStore.getState().collections,
        tab.requestId
      );
      if (request) {
        loadRequestIntoStore(request);
        useCollectionStore.getState().setActiveRequest(request.id);

        // Restore cached response for this request (instant tab switch)
        getCachedResponse(request.id).then((cached) => {
          if (cached) {
            useResponseStore.getState().setResponse(cached);
            useResponseStore.getState().setError(null);
            useResponseStore.getState().setLoading(false);
          } else {
            // Clear response panel for requests without cache
            useResponseStore.getState().setResponse(null);
            useResponseStore.getState().setError(null);
            useResponseStore.getState().setLoading(false);
          }
        });
      }
      setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
    });

    return unsub;
  }, []);

  // Unsaved changes warning on browser close + Ctrl+S shortcut
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { tabs } = useTabStore.getState();
      const hasDirty = tabs.some((t) => t.isDirty);
      if (hasDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Force immediate save + sync
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        forceSave();
      }
      // Ctrl+Z: Undo (only when not in input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          handleUndo();
        }
      }
      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "Z") ||
          ((e.ctrlKey || e.metaKey) && e.key === "y")) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Cache responses when they arrive (for instant tab switching)
  useEffect(() => {
    const unsub = useResponseStore.subscribe((state, prevState) => {
      if (state.response && state.response !== prevState.response) {
        const activeRequestId = useCollectionStore.getState().activeRequestId;
        if (activeRequestId) {
          cacheResponse(activeRequestId, state.response);
        }
      }
    });
    return unsub;
  }, []);

  // Clear dirty tabs when sync completes + update snapshots
  useEffect(() => {
    const unsubscribe = useSyncStore.subscribe((state, prevState) => {
      if (prevState.status === "syncing" && state.status === "synced") {
        const { tabs } = useTabStore.getState();
        tabs.forEach((tab) => {
          if (tab.isDirty) {
            useTabStore.getState().markDirty(tab.id, false);
          }
          const request = findRequestInCollections(
            useCollectionStore.getState().collections,
            tab.requestId
          );
          if (request) {
            useRequestHistoryStore.getState().saveSnapshot(request.id, {
              method: request.method,
              url: request.url,
              headers: request.headers || [{ key: "", value: "", enabled: true }],
              body: request.body || "",
              bodyType: request.bodyType || "none",
              preScript: request.preScript || "",
              testScript: request.testScript || "",
            });
          }
        });
      }
    });
    return unsubscribe;
  }, []);

  // Conflict resolution handlers
  const handleKeepLocal = () => {
    // Keep local changes, force sync to overwrite remote
    useConflictStore.getState().dismiss();
    forceSave();
  };

  const handleTakeRemote = () => {
    // Discard local, reload from remote
    useConflictStore.getState().dismiss();
    const activeRequestId = useCollectionStore.getState().activeRequestId;
    if (activeRequestId) {
      isSyncingFromRemoteRef.current = true;
      loadFromSupabase().then(() => {
        // Reload active request into store
        const request = findRequestInCollections(
          useCollectionStore.getState().collections,
          activeRequestId
        );
        if (request) {
          loadRequestIntoStore(request);
        }
        const activeTabId = useTabStore.getState().activeTabId;
        if (activeTabId) {
          useTabStore.getState().markDirty(activeTabId, false);
        }
        setTimeout(() => { isSyncingFromRemoteRef.current = false; }, 500);
      });
    }
  };

  const conflict = useConflictStore((s) => s.conflict);
  const conflictOpen = useConflictStore((s) => s.isOpen);

  return (
    <>
      {children}
      <ConflictDialog
        isOpen={conflictOpen}
        conflict={conflict}
        onKeepLocal={handleKeepLocal}
        onTakeRemote={handleTakeRemote}
        onClose={() => useConflictStore.getState().dismiss()}
      />
    </>
  );
}

// ============================================
// HELPERS
// ============================================

function forceSave() {
  const activeRequestId = useCollectionStore.getState().activeRequestId;
  if (!activeRequestId) return;

  const { method, url, headers, body, bodyType, preScript, testScript } = useRequestStore.getState();
  useCollectionStore.getState().updateRequest(activeRequestId, {
    method, url, headers, body, bodyType, preScript, testScript,
  });

  // Force immediate sync
  markDirty("collections");
  scheduleSyncToSupabase();
}

function handleUndo() {
  const activeRequestId = useCollectionStore.getState().activeRequestId;
  if (!activeRequestId) return;

  const historyStore = useRequestHistoryStore.getState();
  if (!historyStore.canUndo(activeRequestId)) return;

  // Push current state to redo before undoing
  const current = useRequestStore.getState();
  const currentSnapshot = {
    method: current.method,
    url: current.url,
    headers: current.headers,
    body: current.body,
    bodyType: current.bodyType,
    preScript: current.preScript,
    testScript: current.testScript,
  };

  // Push to redo stack manually
  const { redoStacks } = useRequestHistoryStore.getState();
  const redoStack = redoStacks[activeRequestId] || [];
  useRequestHistoryStore.setState({
    redoStacks: { ...redoStacks, [activeRequestId]: [...redoStack, currentSnapshot] },
  });

  const snapshot = historyStore.undo(activeRequestId);
  if (snapshot) {
    applySnapshot(snapshot);
  }
}

function handleRedo() {
  const activeRequestId = useCollectionStore.getState().activeRequestId;
  if (!activeRequestId) return;

  const historyStore = useRequestHistoryStore.getState();
  if (!historyStore.canRedo(activeRequestId)) return;

  // Push current state to undo before redoing
  const current = useRequestStore.getState();
  const currentSnapshot = {
    method: current.method,
    url: current.url,
    headers: current.headers,
    body: current.body,
    bodyType: current.bodyType,
    preScript: current.preScript,
    testScript: current.testScript,
  };

  const { undoStacks } = useRequestHistoryStore.getState();
  const undoStack = undoStacks[activeRequestId] || [];
  useRequestHistoryStore.setState({
    undoStacks: { ...undoStacks, [activeRequestId]: [...undoStack, currentSnapshot] },
  });

  const snapshot = historyStore.redo(activeRequestId);
  if (snapshot) {
    applySnapshot(snapshot);
  }
}

function applySnapshot(snapshot: any) {
  const reqStore = useRequestStore.getState();
  reqStore.setMethod(snapshot.method as any);
  reqStore.setUrl(snapshot.url);
  reqStore.setHeaders(snapshot.headers);
  reqStore.setBody(snapshot.body);
  reqStore.setBodyType(snapshot.bodyType as any);
  reqStore.setPreScript(snapshot.preScript);
  reqStore.setTestScript(snapshot.testScript);
}

function getRequestSyncData() {
  const s = useRequestStore.getState();
  return { method: s.method, url: s.url, headers: s.headers, body: s.body, bodyType: s.bodyType, preScript: s.preScript, testScript: s.testScript, formData: s.formData };
}

function restoreActiveRequest() {
  const activeTabId = useTabStore.getState().activeTabId;
  if (!activeTabId) return;

  const tab = useTabStore.getState().tabs.find((t) => t.id === activeTabId);
  if (!tab) return;

  const request = findRequestInCollections(
    useCollectionStore.getState().collections,
    tab.requestId
  );
  if (request) {
    loadRequestIntoStore(request);
    useCollectionStore.getState().setActiveRequest(request.id);
  }
}

function loadRequestIntoStore(request: any) {
  const reqStore = useRequestStore.getState();
  reqStore.setMethod(request.method);
  reqStore.setUrl(request.url);
  reqStore.setHeaders(request.headers || [{ key: "", value: "", enabled: true }]);
  reqStore.setBody(request.body || "");
  reqStore.setBodyType(request.bodyType || "none");
  reqStore.setPreScript(request.preScript || "");
  reqStore.setTestScript(request.testScript || "");

  // Save snapshot for revert functionality
  useRequestHistoryStore.getState().saveSnapshot(request.id, {
    method: request.method,
    url: request.url,
    headers: request.headers || [{ key: "", value: "", enabled: true }],
    body: request.body || "",
    bodyType: request.bodyType || "none",
    preScript: request.preScript || "",
    testScript: request.testScript || "",
  });
}

function findRequestInCollections(
  collections: { requests: any[]; folders: any[] }[],
  requestId: string
): any | null {
  for (const col of collections) {
    const found = col.requests.find((r: any) => r.id === requestId);
    if (found) return found;
    const inFolder = findRequestInFolders(col.folders, requestId);
    if (inFolder) return inFolder;
  }
  return null;
}

function findRequestInFolders(folders: any[], requestId: string): any | null {
  for (const folder of folders) {
    const found = folder.requests.find((r: any) => r.id === requestId);
    if (found) return found;
    const inSub = findRequestInFolders(folder.folders || [], requestId);
    if (inSub) return inSub;
  }
  return null;
}
