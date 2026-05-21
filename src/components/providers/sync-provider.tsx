"use client";

import { useEffect, useRef } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { useFlowStore } from "@/store/flow-store";
import { useMockStore } from "@/store/mock-store";
import { useCookieStore } from "@/store/cookie-store";
import { useRequestStore } from "@/store/request-store";
import {
  loadAllFromSupabase,
  scheduleSyncToSupabase,
  subscribeToRealtime,
  unsubscribeFromRealtime,
  migrateLocalStorageIds,
  markDirty,
} from "@/lib/supabase/sync";

/**
 * SyncProvider (No Auth)
 * 
 * Strategy:
 * 1. On mount: migrate old IDs, load from Supabase if empty
 * 2. On store change: debounced partial sync to Supabase
 * 3. Realtime subscription for multi-device sync
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const initialLoadDone = useRef(false);

  const collections = useCollectionStore((s) => s.collections);
  const environments = useEnvironmentStore((s) => s.environments);
  const flows = useFlowStore((s) => s.flows);
  const mockServers = useMockStore((s) => s.servers);
  const cookies = useCookieStore((s) => s.cookies);
  const history = useRequestStore((s) => s.history);

  // Initial load + migration + realtime
  useEffect(() => {
    async function init() {
      // Migrate old non-UUID IDs
      migrateLocalStorageIds();

      const localCollections = useCollectionStore.getState().collections;
      if (localCollections.length === 0) {
        await loadAllFromSupabase();
      }

      // Subscribe to realtime changes
      subscribeToRealtime();
      initialLoadDone.current = true;
    }

    init();
    return () => { unsubscribeFromRealtime(); };
  }, []);

  // Track which domains changed for partial sync
  const prevCollections = useRef(collections);
  const prevEnvironments = useRef(environments);
  const prevFlows = useRef(flows);
  const prevMockServers = useRef(mockServers);
  const prevCookies = useRef(cookies);
  const prevHistory = useRef(history);

  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (collections !== prevCollections.current) markDirty("collections");
    if (environments !== prevEnvironments.current) markDirty("environments");
    if (flows !== prevFlows.current) markDirty("flows");
    if (mockServers !== prevMockServers.current) markDirty("mocks");
    if (cookies !== prevCookies.current) markDirty("cookies");
    if (history !== prevHistory.current) markDirty("history");

    prevCollections.current = collections;
    prevEnvironments.current = environments;
    prevFlows.current = flows;
    prevMockServers.current = mockServers;
    prevCookies.current = cookies;
    prevHistory.current = history;

    scheduleSyncToSupabase();
  }, [collections, environments, flows, mockServers, cookies, history]);

  return <>{children}</>;
}
