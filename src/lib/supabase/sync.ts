// @ts-nocheck
/**
 * Supabase Sync Service (No Auth)
 * Features:
 * 1. Realtime subscription for multi-device sync
 * 2. Conflict resolution (last-write-wins with timestamp)
 * 3. Retry with exponential backoff
 * 4. Sync status indicator
 * 5. Partial sync (dirty tracking)
 */

import { getSupabase } from "./client";
import { useCollectionStore, Collection, RequestItem, Folder } from "@/store/collection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { useFlowStore } from "@/store/flow-store";
import { useMockStore } from "@/store/mock-store";
import { useCookieStore } from "@/store/cookie-store";
import { useRequestStore } from "@/store/request-store";
import { useSyncStore } from "@/store/sync-store";
import { useToastStore } from "@/store/toast-store";
import { useSyncHealthStore } from "@/store/sync-health-store";

const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

function getSyncClient(): any {
  return getSupabase();
}

// ============================================
// DIRTY TRACKING - only sync what changed
// ============================================

type DirtyDomain = "collections" | "environments" | "flows" | "mocks" | "cookies" | "history";
const dirtySet = new Set<DirtyDomain>();

export function markDirty(domain: DirtyDomain) {
  dirtySet.add(domain);
  useSyncStore.getState().incrementPending();
}

export function markAllDirty() {
  const all: DirtyDomain[] = ["collections", "environments", "flows", "mocks", "cookies", "history"];
  all.forEach((d) => dirtySet.add(d));
}

// ============================================
// RETRY WITH EXPONENTIAL BACKOFF
// ============================================

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  const syncStore = useSyncStore.getState();
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      syncStore.incrementRetry();
      const delay = BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(`[Sync] ${label} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${Math.round(delay)}ms...`, err);

      if (attempt > MAX_RETRIES) {
        console.error(`[Sync] ${label} failed after ${MAX_RETRIES} retries`);
        useSyncStore.getState().setError(`${label} failed after ${MAX_RETRIES} retries`);
        return null;
      }

      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}

// ============================================
// INITIALIZE (ensure default workspace exists)
// ============================================

let workspaceReady: boolean | null = null;

async function ensureDefaultWorkspace() {
  const supabase = getSyncClient();
  if (!supabase) {
    console.warn("[Sync] No Supabase client available");
    return false;
  }

  // Cache result to avoid repeated checks
  if (workspaceReady !== null) return workspaceReady;

  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();

  if (data) {
    workspaceReady = true;
    return true;
  }

  // Workspace doesn't exist — cannot create via API due to FK constraints
  // User must seed it manually via Supabase SQL Editor
  console.error("[Sync] Workspace not ready, skipping collection sync");
  console.error("[Sync] Please run the seed SQL in Supabase SQL Editor. See console for details.");
  console.info(`
-- Run this in Supabase SQL Editor:
ALTER TABLE profiles DISABLE TRIGGER ALL;
INSERT INTO profiles (id, email, display_name) 
VALUES ('${DEFAULT_USER_ID}', 'local@hantara.app', 'Local User')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE profiles ENABLE TRIGGER ALL;

ALTER TABLE workspaces DISABLE TRIGGER ALL;
INSERT INTO workspaces (id, name, owner_id) 
VALUES ('${DEFAULT_WORKSPACE_ID}', 'My Workspace', '${DEFAULT_USER_ID}')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE workspaces ENABLE TRIGGER ALL;

ALTER TABLE workspace_members DISABLE TRIGGER ALL;
INSERT INTO workspace_members (workspace_id, user_id, role) 
VALUES ('${DEFAULT_WORKSPACE_ID}', '${DEFAULT_USER_ID}', 'owner')
ON CONFLICT DO NOTHING;
ALTER TABLE workspace_members ENABLE TRIGGER ALL;
  `);

  workspaceReady = false;
  return false;
}

// ============================================
// CONFLICT RESOLUTION (last-write-wins)
// ============================================

async function resolveConflict(table: string, id: string, localUpdatedAt: string): Promise<"local" | "remote"> {
  const supabase = getSyncClient();
  if (!supabase) return "local";

  const { data } = await supabase
    .from(table)
    .select("updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!data || !data.updated_at) return "local";

  const remoteTime = new Date(data.updated_at).getTime();
  const localTime = new Date(localUpdatedAt).getTime();

  return localTime >= remoteTime ? "local" : "remote";
}

// ============================================
// SYNC COLLECTIONS TO SUPABASE (BATCH UPSERT)
// ============================================

export async function syncCollectionsToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const wsReady = await ensureDefaultWorkspace();
  if (!wsReady) {
    console.error("[Sync] Workspace not ready, skipping collection sync");
    return;
  }

  const { collections } = useCollectionStore.getState();
  console.log("[Sync] Batch syncing", collections.length, "collections...");

  const now = new Date().toISOString();

  // Batch upsert collections
  const collectionRows = collections.map((col, i) => ({
    id: col.id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: col.name,
    sort_order: i,
    updated_at: now,
  }));

  if (collectionRows.length > 0) {
    const { error } = await supabase.from("collections").upsert(collectionRows, { onConflict: "id" });
    if (error) console.error("[Sync] Collections batch upsert failed:", error);
  }

  // Flatten all folders and requests for batch upsert
  const allFolderRows: any[] = [];

  for (const collection of collections) {
    flattenFolders(collection.id, collection.folders, null, allFolderRows);
  }

  const allRequestRows = flattenAllRequests(collections);

  // Batch upsert folders
  if (allFolderRows.length > 0) {
    // Supabase has a row limit per request, batch in chunks of 500
    for (let i = 0; i < allFolderRows.length; i += 500) {
      const chunk = allFolderRows.slice(i, i + 500);
      const { error } = await supabase.from("folders").upsert(chunk, { onConflict: "id" });
      if (error) console.error("[Sync] Folders batch upsert failed:", error);
    }
  }

  // Batch upsert requests
  if (allRequestRows.length > 0) {
    for (let i = 0; i < allRequestRows.length; i += 500) {
      const chunk = allRequestRows.slice(i, i + 500);
      const { error } = await supabase.from("requests").upsert(chunk, { onConflict: "id" });
      if (error) console.error("[Sync] Requests batch upsert failed:", error);
    }
  }

  // Delete removed collections (diff against remote)
  const { data: remoteCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteCollections) {
    const localIds = new Set(collections.map((c) => c.id));
    const toDelete = (remoteCollections as any[]).filter((r) => !localIds.has(r.id)).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("collections").delete().in("id", toDelete);
    }
  }

  // Delete removed folders
  const { data: remoteFolders } = await supabase
    .from("folders")
    .select("id")
    .in("collection_id", collections.map((c) => c.id));

  if (remoteFolders) {
    const localFolderIds = new Set(allFolderRows.map((f) => f.id));
    const toDelete = (remoteFolders as any[]).filter((r) => !localFolderIds.has(r.id)).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("folders").delete().in("id", toDelete);
    }
  }

  // Delete removed requests
  const { data: remoteRequests } = await supabase
    .from("requests")
    .select("id")
    .in("collection_id", collections.map((c) => c.id));

  if (remoteRequests) {
    const localRequestIds = new Set(allRequestRows.map((r) => r.id));
    const toDelete = (remoteRequests as any[]).filter((r) => !localRequestIds.has(r.id)).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("requests").delete().in("id", toDelete);
    }
  }
}

function flattenFolders(collectionId: string, folders: Folder[], parentFolderId: string | null, outFolders: any[]) {
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    outFolders.push({
      id: folder.id,
      collection_id: collectionId,
      parent_folder_id: parentFolderId,
      name: folder.name,
      sort_order: i,
    });
    flattenFolders(collectionId, folder.folders, folder.id, outFolders);
  }
}

function flattenRequests(collectionId: string, folderId: string | null, requests: RequestItem[], out: any[]) {
  const now = new Date().toISOString();
  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    out.push({
      id: req.id,
      collection_id: collectionId,
      folder_id: folderId,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers,
      params: req.params,
      body: req.body,
      body_type: req.bodyType,
      request_type: req.requestType || "http",
      pre_script: req.preScript || "",
      test_script: req.testScript || "",
      auth_type: req.authType || "none",
      auth_config: req.authConfig || {},
      sort_order: i,
      updated_at: now,
    });
  }
}

function flattenAllRequests(collections: Collection[]): any[] {
  const out: any[] = [];
  for (const col of collections) {
    flattenRequests(col.id, null, col.requests, out);
    flattenRequestsFromFolders(col.id, col.folders, out);
  }
  return out;
}

function flattenRequestsFromFolders(collectionId: string, folders: Folder[], out: any[]) {
  for (const folder of folders) {
    flattenRequests(collectionId, folder.id, folder.requests, out);
    flattenRequestsFromFolders(collectionId, folder.folders, out);
  }
}

// ============================================
// SYNC ENVIRONMENTS TO SUPABASE (BATCH)
// ============================================

export async function syncEnvironmentsToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { environments, globals } = useEnvironmentStore.getState();
  const now = new Date().toISOString();

  // Batch upsert all environments
  const envRows = environments.map((env) => ({
    id: env.id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: env.name,
    variables: env.variables,
    is_global: false,
    updated_at: now,
  }));

  // Add globals as a special environment
  const globalEnvId = "00000000-0000-0000-0000-000000000099";
  envRows.push({
    id: globalEnvId,
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: "Globals",
    variables: globals as any,
    is_global: true,
    updated_at: now,
  });

  if (envRows.length > 0) {
    const { error } = await supabase.from("environments").upsert(envRows, { onConflict: "id" });
    if (error) console.error("[Sync] Environments batch upsert failed:", error);
  }
}

// ============================================
// SYNC FLOWS TO SUPABASE (BATCH)
// ============================================

export async function syncFlowsToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { flows } = useFlowStore.getState();
  const now = new Date().toISOString();

  const flowRows = flows.map((flow) => ({
    id: flow.id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: flow.name,
    description: flow.description || "",
    steps: flow.steps,
    delay_between_requests: flow.delayBetweenRequests || 0,
    updated_at: now,
  }));

  if (flowRows.length > 0) {
    const { error } = await supabase.from("flows").upsert(flowRows, { onConflict: "id" });
    if (error) console.error("[Sync] Flows batch upsert failed:", error);
  }

  // Delete removed flows
  const { data: remoteFlows } = await supabase
    .from("flows")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteFlows) {
    const localIds = new Set(flows.map((f) => f.id));
    const toDelete = (remoteFlows as any[]).filter((r) => !localIds.has(r.id)).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("flows").delete().in("id", toDelete);
    }
  }
}

// ============================================
// SYNC MOCK SERVERS TO SUPABASE (BATCH)
// ============================================

export async function syncMockServersToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { servers } = useMockStore.getState();
  const now = new Date().toISOString();

  // Batch upsert servers
  const serverRows = servers.map((server) => ({
    id: server.id,
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: server.name,
    base_path: server.baseUrl || `/mock/${server.id.slice(0, 8)}`,
    is_active: server.isActive,
    updated_at: now,
  }));

  if (serverRows.length > 0) {
    const { error } = await supabase.from("mock_servers").upsert(serverRows, { onConflict: "id" });
    if (error) console.error("[Sync] Mock servers batch upsert failed:", error);
  }

  // Batch upsert all routes
  const allRouteRows: any[] = [];
  for (const server of servers) {
    for (const route of server.routes) {
      allRouteRows.push({
        id: route.id,
        mock_server_id: server.id,
        method: route.method,
        path: route.path,
        response_status: route.responseStatus,
        response_headers: route.responseHeaders,
        response_body: route.responseBody,
        delay_ms: route.delayMs,
        is_active: route.isActive,
      });
    }
  }

  if (allRouteRows.length > 0) {
    for (let i = 0; i < allRouteRows.length; i += 500) {
      const chunk = allRouteRows.slice(i, i + 500);
      const { error } = await supabase.from("mock_routes").upsert(chunk, { onConflict: "id" });
      if (error) console.error("[Sync] Mock routes batch upsert failed:", error);
    }
  }

  // Delete removed servers
  const { data: remoteServers } = await supabase
    .from("mock_servers")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteServers) {
    const localIds = new Set(servers.map((s) => s.id));
    const toDelete = (remoteServers as any[]).filter((r) => !localIds.has(r.id)).map((r) => r.id);
    if (toDelete.length > 0) {
      await supabase.from("mock_servers").delete().in("id", toDelete);
    }
  }
}

// ============================================
// SYNC COOKIES TO SUPABASE
// ============================================

export async function syncCookiesToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { cookies } = useCookieStore.getState();

  await supabase
    .from("cookies")
    .delete()
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (cookies.length > 0) {
    const cookieRows = cookies.map((c) => ({
      id: c.id,
      workspace_id: DEFAULT_WORKSPACE_ID,
      domain: c.domain,
      name: c.name,
      value: c.value,
      path: c.path,
      secure: c.secure,
      http_only: c.httpOnly,
      expires_at: c.expiresAt,
    }));

    await supabase.from("cookies").insert(cookieRows);
  }
}

// ============================================
// SYNC HISTORY TO SUPABASE (BATCH)
// ============================================

export async function syncHistoryToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { history } = useRequestStore.getState();
  const items = history.slice(0, 50);

  if (items.length === 0) return;

  // Get existing IDs to avoid duplicates
  const { data: existing } = await supabase
    .from("request_history")
    .select("id")
    .in("id", items.map((i) => i.id));

  const existingIds = new Set((existing || []).map((e: any) => e.id));
  const newItems = items.filter((i) => !existingIds.has(i.id));

  if (newItems.length > 0) {
    const rows = newItems.map((item) => ({
      id: item.id,
      user_id: DEFAULT_USER_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      method: item.method,
      url: item.url,
      status: item.status,
      response_time: item.time,
    }));

    const { error } = await supabase.from("request_history").insert(rows);
    if (error) console.error("[Sync] History batch insert failed:", error);
  }
}

// ============================================
// AUTO-SYNC (debounced + partial + retry)
// ============================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncToSupabase() {
  // If offline, queue changes instead of syncing
  if (!isOnline) {
    const domains = dirtySet.size > 0 ? [...dirtySet] : [];
    for (const domain of domains) {
      queueOfflineChange(domain);
    }
    dirtySet.clear();
    return;
  }

  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    const syncStore = useSyncStore.getState();
    syncStore.setStatus("syncing");

    try {
      console.log("[Sync] Starting partial sync...", [...dirtySet]);

      // If nothing dirty, sync everything (first time or forced)
      const domains = dirtySet.size > 0 ? [...dirtySet] : ["collections", "environments", "flows", "mocks", "cookies", "history"] as DirtyDomain[];
      dirtySet.clear();

      for (const domain of domains) {
        await withRetry(async () => {
          switch (domain) {
            case "collections": await syncCollectionsToSupabase(); break;
            case "environments": await syncEnvironmentsToSupabase(); break;
            case "flows": await syncFlowsToSupabase(); break;
            case "mocks": await syncMockServersToSupabase(); break;
            case "cookies": await syncCookiesToSupabase(); break;
            case "history": await syncHistoryToSupabase(); break;
          }
        }, `sync-${domain}`);
      }

      useSyncStore.getState().setSynced();
      useSyncHealthStore.getState().addEvent("sync-success", `Synced ${domains.length} domain(s)`);
      console.log("[Sync] Sync completed successfully");
    } catch (err) {
      console.error("[Sync] Sync failed:", err);
      useSyncStore.getState().setError(err instanceof Error ? err.message : "Sync failed");
      useSyncHealthStore.getState().addEvent("sync-error", err instanceof Error ? err.message : "Sync failed");
      useToastStore.getState().addToast("error", "Sync failed. Will retry automatically.");
    }
  }, 2000);
}

// ============================================
// REALTIME SUBSCRIPTION (multi-device sync)
// ============================================

let realtimeChannel: any = null;
let isReceivingRemote = false;
let realtimeSubscribeTimer: ReturnType<typeof setTimeout> | null = null;
let realtimeAborted = false;
let realtimeRetryAttempt = 0;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastHeartbeatResponse = Date.now();

// Exponential backoff config for realtime reconnection
const REALTIME_BASE_DELAY = 5000;
const REALTIME_MAX_DELAY = 60000;
const HEARTBEAT_INTERVAL = 30000; // 30s
const HEARTBEAT_TIMEOUT = 10000; // 10s without response = stale

// Flag to prevent sync loop: when loading from remote, store changes should NOT trigger sync back
let isSyncingFromRemote = false;

export function getIsSyncingFromRemote() {
  return isSyncingFromRemote;
}

// ============================================
// PER-TAB DEDUP via BroadcastChannel
// ============================================

let broadcastChannel: BroadcastChannel | null = null;
let isLeaderTab = true;
let leaderHeartbeatInterval: ReturnType<typeof setInterval> | null = null;
let leaderCheckTimeout: ReturnType<typeof setTimeout> | null = null;

function initTabLeaderElection() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    // No BroadcastChannel support — this tab is always leader
    isLeaderTab = true;
    useSyncStore.getState().setIsLeaderTab(true);
    return;
  }

  broadcastChannel = new BroadcastChannel("hantara-realtime-leader");

  broadcastChannel.onmessage = (event) => {
    const { type, tabId } = event.data;

    if (type === "leader-claim" && tabId !== getTabId()) {
      // Another tab claimed leadership
      isLeaderTab = false;
      useSyncStore.getState().setIsLeaderTab(false);
      stopRealtimeSubscription();
    } else if (type === "leader-heartbeat" && tabId !== getTabId()) {
      // Leader is alive, reset check timeout
      if (leaderCheckTimeout) clearTimeout(leaderCheckTimeout);
      leaderCheckTimeout = setTimeout(tryClaimLeadership, 5000);
    } else if (type === "leader-resign") {
      // Leader resigned, try to claim
      setTimeout(tryClaimLeadership, Math.random() * 500);
    } else if (type === "realtime-change") {
      // Forwarded realtime change from leader tab
      if (!isLeaderTab) {
        handleRealtimeChange(event.data.payload);
      }
    }
  };

  // Try to claim leadership on init
  tryClaimLeadership();
}

function tryClaimLeadership() {
  isLeaderTab = true;
  useSyncStore.getState().setIsLeaderTab(true);
  broadcastChannel?.postMessage({ type: "leader-claim", tabId: getTabId() });

  // Start heartbeat
  if (leaderHeartbeatInterval) clearInterval(leaderHeartbeatInterval);
  leaderHeartbeatInterval = setInterval(() => {
    if (isLeaderTab) {
      broadcastChannel?.postMessage({ type: "leader-heartbeat", tabId: getTabId() });
    }
  }, 2000);
}

function resignLeadership() {
  if (!isLeaderTab) return;
  isLeaderTab = false;
  useSyncStore.getState().setIsLeaderTab(false);
  broadcastChannel?.postMessage({ type: "leader-resign", tabId: getTabId() });
  if (leaderHeartbeatInterval) {
    clearInterval(leaderHeartbeatInterval);
    leaderHeartbeatInterval = null;
  }
}

let _tabId: string | null = null;
function getTabId(): string {
  if (!_tabId) {
    _tabId = crypto.randomUUID();
  }
  return _tabId;
}

function destroyTabLeaderElection() {
  resignLeadership();
  if (leaderCheckTimeout) clearTimeout(leaderCheckTimeout);
  if (leaderHeartbeatInterval) clearInterval(leaderHeartbeatInterval);
  broadcastChannel?.close();
  broadcastChannel = null;
}

// ============================================
// OFFLINE QUEUE
// ============================================

let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

function initOfflineDetection() {
  if (typeof window === "undefined") return;

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

function destroyOfflineDetection() {
  if (typeof window === "undefined") return;
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
}

function handleOnline() {
  isOnline = true;
  console.log("[Realtime] Back online — flushing offline queue and reconnecting");
  useSyncHealthStore.getState().addEvent("online", "Network connection restored");
  useToastStore.getState().addToast("success", "Back online — syncing queued changes");
  flushOfflineQueue();
  // Reconnect realtime
  if (isLeaderTab) {
    subscribeToRealtime();
  }
}

function handleOffline() {
  isOnline = false;
  console.log("[Realtime] Went offline — queuing changes locally");
  useSyncStore.getState().setRealtimeStatus("disconnected");
  useSyncHealthStore.getState().addEvent("offline", "Network connection lost");
  useToastStore.getState().addToast("error", "You are offline. Changes will be saved locally.");
}

async function flushOfflineQueue() {
  const { offlineQueue } = useSyncStore.getState();
  if (offlineQueue.length === 0) return;

  console.log("[Sync] Flushing", offlineQueue.length, "offline changes");

  // Mark all domains dirty and trigger sync
  for (const change of offlineQueue) {
    markDirty(change.domain as DirtyDomain);
  }
  useSyncStore.getState().clearOfflineQueue();
  scheduleSyncToSupabase();
}

export function queueOfflineChange(domain: string, data?: any) {
  if (isOnline) return false; // Not offline, don't queue

  useSyncStore.getState().enqueueOfflineChange({
    id: crypto.randomUUID(),
    domain,
    timestamp: Date.now(),
    data,
  });
  return true; // Queued
}

// ============================================
// HEARTBEAT / PING CHECK
// ============================================

function startHeartbeat() {
  stopHeartbeat();
  lastHeartbeatResponse = Date.now();

  heartbeatInterval = setInterval(() => {
    if (!realtimeChannel) return;

    const timeSinceLastResponse = Date.now() - lastHeartbeatResponse;

    if (timeSinceLastResponse > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
      // Connection is stale — force reconnect
      console.warn("[Realtime] Heartbeat timeout — connection stale, reconnecting...");
      useSyncStore.getState().setRealtimeStatus("reconnecting");
      useSyncHealthStore.getState().addEvent("reconnecting", "Heartbeat timeout — connection stale");
      useToastStore.getState().addToast("warning", "Sync connection stale. Reconnecting...");
      stopRealtimeSubscription();
      subscribeToRealtime();
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function onHeartbeatReceived() {
  const now = Date.now();
  if (lastHeartbeatResponse > 0) {
    const latency = now - lastHeartbeatResponse;
    // Only update latency if it's a reasonable measurement (not first call)
    if (latency < HEARTBEAT_INTERVAL * 2) {
      useSyncHealthStore.getState().setLatency(latency);
    }
  }
  lastHeartbeatResponse = now;
  useSyncHealthStore.getState().setLastPing(now);
}

// ============================================
// SUBSCRIBE / UNSUBSCRIBE
// ============================================

export function subscribeToRealtime() {
  const supabase = getSyncClient();
  if (!supabase) return;

  // Initialize tab leader election on first call
  if (!broadcastChannel && typeof window !== "undefined") {
    initTabLeaderElection();
    initOfflineDetection();
  }

  // Only leader tab subscribes to realtime
  if (!isLeaderTab) {
    useSyncStore.getState().setRealtimeStatus("connected");
    return;
  }

  if (!isOnline) {
    useSyncStore.getState().setRealtimeStatus("disconnected");
    return;
  }

  // Reset abort flag
  realtimeAborted = false;

  // Unsubscribe existing
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  // Clear any pending subscribe timer
  if (realtimeSubscribeTimer) {
    clearTimeout(realtimeSubscribeTimer);
    realtimeSubscribeTimer = null;
  }

  useSyncStore.getState().setRealtimeStatus(
    realtimeRetryAttempt > 0 ? "reconnecting" : "connecting"
  );

  // Delay subscription to avoid race condition with React Strict Mode double-mount
  realtimeSubscribeTimer = setTimeout(() => {
    realtimeSubscribeTimer = null;
    if (realtimeAborted) return;

    const client = getSyncClient();
    if (!client) return;

    realtimeChannel = client
      .channel("workspace-sync")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "collections",
        filter: `workspace_id=eq.${DEFAULT_WORKSPACE_ID}`,
      }, handleRealtimeChangeWithBroadcast)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "requests",
      }, handleRealtimeChangeWithBroadcast)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "folders",
      }, handleRealtimeChangeWithBroadcast)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "environments",
        filter: `workspace_id=eq.${DEFAULT_WORKSPACE_ID}`,
      }, handleRealtimeChangeWithBroadcast)
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] Connected successfully");
          useSyncStore.getState().setRealtimeStatus("connected");
          useSyncStore.getState().resetRealtimeRetry();
          useSyncHealthStore.getState().addEvent("connected", "Realtime connection established");
          if (realtimeRetryAttempt > 0) {
            useToastStore.getState().addToast("success", "Sync reconnected successfully");
          }
          realtimeRetryAttempt = 0;
          onHeartbeatReceived();
          startHeartbeat();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[Realtime] ${status} — will retry with backoff`);
          useSyncStore.getState().setRealtimeStatus("reconnecting");
          useSyncStore.getState().incrementRealtimeRetry();
          useSyncHealthStore.getState().addEvent("reconnecting", `Channel ${status.toLowerCase()} — retrying...`);
          if (realtimeRetryAttempt === 0) {
            useToastStore.getState().addToast("warning", "Sync connection lost. Reconnecting...");
          }
          stopHeartbeat();
          scheduleRealtimeRetry();
        } else if (status === "CLOSED") {
          useSyncStore.getState().setRealtimeStatus("disconnected");
          useSyncHealthStore.getState().addEvent("disconnected", "Realtime channel closed");
          stopHeartbeat();
        }
      });
  }, 100);
}

function scheduleRealtimeRetry() {
  realtimeRetryAttempt++;
  // Exponential backoff: 5s → 10s → 20s → 40s → 60s (capped)
  const delay = Math.min(
    REALTIME_BASE_DELAY * Math.pow(2, realtimeRetryAttempt - 1),
    REALTIME_MAX_DELAY
  ) + Math.random() * 1000;

  console.log(`[Realtime] Retrying in ${Math.round(delay / 1000)}s (attempt ${realtimeRetryAttempt})`);

  setTimeout(() => {
    if (!realtimeAborted && isLeaderTab && isOnline) {
      subscribeToRealtime();
    }
  }, delay);
}

function stopRealtimeSubscription() {
  const supabase = getSyncClient();
  if (supabase && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  stopHeartbeat();
}

export function unsubscribeFromRealtime() {
  // Abort any pending delayed subscription
  realtimeAborted = true;
  if (realtimeSubscribeTimer) {
    clearTimeout(realtimeSubscribeTimer);
    realtimeSubscribeTimer = null;
  }

  stopRealtimeSubscription();
  destroyTabLeaderElection();
  destroyOfflineDetection();
  useSyncStore.getState().setRealtimeStatus("disconnected");
}

// Wrapper that forwards changes to other tabs via BroadcastChannel
function handleRealtimeChangeWithBroadcast(payload: any) {
  onHeartbeatReceived(); // Any message = connection alive

  // Selective subscription: only process changes for active tables
  if (activeTables.size > 0 && !activeTables.has(payload.table)) {
    return; // Ignore changes for tables not actively being edited
  }

  // Forward to non-leader tabs
  if (broadcastChannel && isLeaderTab) {
    broadcastChannel.postMessage({ type: "realtime-change", payload });
  }

  handleRealtimeChange(payload);
}

// ============================================
// SELECTIVE REALTIME SUBSCRIPTION
// ============================================

// Track which tables are actively being edited — empty = subscribe to all
const activeTables = new Set<string>();

/**
 * Set which tables to actively listen for realtime changes.
 * Pass empty array to listen to all tables (default behavior).
 * Pass specific tables to reduce bandwidth and processing.
 * 
 * Example: setActiveTables(["requests", "collections"])
 */
export function setActiveTables(tables: string[]) {
  activeTables.clear();
  tables.forEach((t) => activeTables.add(t));
}

/**
 * Add a table to the active subscription set.
 * When a user starts editing a request, call addActiveTable("requests").
 */
export function addActiveTable(table: string) {
  activeTables.add(table);
}

/**
 * Remove a table from the active subscription set.
 * When a user stops editing, call removeActiveTable("requests").
 */
export function removeActiveTable(table: string) {
  activeTables.delete(table);
}

/**
 * Clear all active table filters — listen to everything.
 */
export function clearActiveTableFilter() {
  activeTables.clear();
}

// Debounced reload from remote on realtime change
let realtimeReloadTimeout: ReturnType<typeof setTimeout> | null = null;

// Conflict callback — set by SyncProvider
type ConflictCallback = (payload: { table: string; eventType: string; requestId?: string }) => void;
let onConflictDetected: ConflictCallback | null = null;

export function setConflictCallback(cb: ConflictCallback | null) {
  onConflictDetected = cb;
}

function handleRealtimeChange(payload: any) {
  // Ignore changes we just made ourselves
  if (isReceivingRemote) return;

  console.log("[Realtime] Change detected:", payload.table, payload.eventType);

  // Check for conflict: if the change is for the active request and user has dirty edits
  if (payload.table === "requests" && payload.new?.id) {
    const { useCollectionStore } = require("@/store/collection-store");
    const { useTabStore } = require("@/store/tab-store");
    const activeRequestId = useCollectionStore.getState().activeRequestId;
    const activeTab = useTabStore.getState().tabs.find(
      (t: any) => t.id === useTabStore.getState().activeTabId
    );

    if (activeRequestId === payload.new.id && activeTab?.isDirty) {
      // Conflict detected — notify UI instead of silently overwriting
      if (onConflictDetected) {
        onConflictDetected({
          table: payload.table,
          eventType: payload.eventType,
          requestId: payload.new.id,
        });
        return; // Don't auto-reload, let user decide
      }
    }
  }

  // Debounce reload to avoid rapid-fire updates
  if (realtimeReloadTimeout) clearTimeout(realtimeReloadTimeout);
  realtimeReloadTimeout = setTimeout(async () => {
    isReceivingRemote = true;
    isSyncingFromRemote = true;
    try {
      await loadFromSupabase();
      console.log("[Realtime] Reloaded data from remote");
    } finally {
      // Reset flags after a short delay to allow sync to settle
      setTimeout(() => {
        isReceivingRemote = false;
        isSyncingFromRemote = false;
      }, 3000);
    }
  }, 1000);
}

// ============================================
// LOAD FROM SUPABASE
// ============================================

export async function loadFromSupabase(): Promise<boolean> {
  const supabase = getSyncClient();
  if (!supabase) return false;

  try {
    const { data: collections, error } = await supabase
      .from("collections")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .order("sort_order");

    if (error || !collections || (collections as any[]).length === 0) return false;

    const collectionIds = (collections as any[]).map((c: any) => c.id);
    const { data: allFolders } = await supabase
      .from("folders")
      .select("*")
      .in("collection_id", collectionIds)
      .order("sort_order");

    const { data: allRequests } = await supabase
      .from("requests")
      .select("*")
      .in("collection_id", collectionIds)
      .order("sort_order");

    const builtCollections: Collection[] = (collections as any[]).map((col: any) => {
      const colFolders = (allFolders || []).filter((f: any) => f.collection_id === col.id);
      const colRequests = (allRequests || []).filter((r: any) => r.collection_id === col.id);

      return {
        id: col.id,
        name: col.name,
        requests: colRequests
          .filter((r: any) => !r.folder_id)
          .map(mapDbRequestToLocal),
        folders: buildFolderTree(colFolders, colRequests, null),
        isOpen: false,
      };
    });

    useCollectionStore.setState({ collections: builtCollections });

    // Load environments
    const { data: environments } = await supabase
      .from("environments")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID);

    if (environments && (environments as any[]).length > 0) {
      const regularEnvs = (environments as any[])
        .filter((e: any) => !e.is_global)
        .map((e: any) => ({
          id: e.id,
          name: e.name,
          variables: Array.isArray(e.variables)
            ? e.variables
            : [{ key: "", initialValue: "", currentValue: "", type: "default", enabled: true }],
        }));

      const globalEnv = (environments as any[]).find((e: any) => e.is_global);
      const globalVars = globalEnv && Array.isArray(globalEnv.variables)
        ? globalEnv.variables
        : [{ key: "", initialValue: "", currentValue: "", type: "default", enabled: true }];

      useEnvironmentStore.setState({
        environments: regularEnvs as any,
        globals: globalVars as any,
      });
    }

    return true;
  } catch (err) {
    console.error("[Sync] Failed to load from Supabase:", err);
    return false;
  }
}

function buildFolderTree(allFolders: any[], allRequests: any[], parentId: string | null): Folder[] {
  const children = allFolders.filter((f: any) => f.parent_folder_id === parentId);
  return children.map((folder: any) => ({
    id: folder.id,
    name: folder.name,
    requests: allRequests
      .filter((r: any) => r.folder_id === folder.id)
      .map(mapDbRequestToLocal),
    folders: buildFolderTree(allFolders, allRequests, folder.id),
    isOpen: false,
  }));
}

function mapDbRequestToLocal(r: any): RequestItem {
  return {
    id: r.id,
    name: r.name || "Untitled",
    method: r.method || "GET",
    url: r.url || "",
    headers: Array.isArray(r.headers) ? r.headers : [{ key: "", value: "", enabled: true }],
    params: Array.isArray(r.params) ? r.params : [{ key: "", value: "", enabled: true }],
    body: r.body || "",
    bodyType: r.body_type || "none",
    requestType: r.request_type || "http",
    preScript: r.pre_script || "",
    testScript: r.test_script || "",
    authType: r.auth_type || "none",
    authConfig: r.auth_config || {},
  };
}

// ============================================
// LOAD ALL FROM SUPABASE (extended)
// ============================================

export async function loadAllFromSupabase(): Promise<boolean> {
  const supabase = getSyncClient();
  if (!supabase) return false;

  const collectionsLoaded = await loadFromSupabase();

  try {
    const { data: flows } = await supabase
      .from("flows")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID);

    if (flows && (flows as any[]).length > 0) {
      const mappedFlows = (flows as any[]).map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || "",
        steps: Array.isArray(f.steps) ? f.steps : [],
        delayBetweenRequests: f.delay_between_requests || 0,
        createdAt: new Date(f.created_at).getTime(),
      }));
      useFlowStore.setState({ flows: mappedFlows });
    }
  } catch (err) {
    console.error("[Sync] Failed to load flows:", err);
  }

  try {
    const { data: servers } = await supabase
      .from("mock_servers")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID);

    if (servers && (servers as any[]).length > 0) {
      const serverIds = (servers as any[]).map((s: any) => s.id);
      const { data: routes } = await supabase
        .from("mock_routes")
        .select("*")
        .in("mock_server_id", serverIds);

      const mappedServers = (servers as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        baseUrl: s.base_path || `/mock/${s.id.slice(0, 8)}`,
        isActive: s.is_active,
        createdAt: new Date(s.created_at).getTime(),
        routes: (routes as any[] || [])
          .filter((r: any) => r.mock_server_id === s.id)
          .map((r: any) => ({
            id: r.id,
            method: r.method,
            path: r.path,
            responseStatus: r.response_status,
            responseHeaders: r.response_headers || {},
            responseBody: r.response_body || "",
            delayMs: r.delay_ms || 0,
            isActive: r.is_active,
            description: "",
          })),
      }));
      useMockStore.setState({ servers: mappedServers });
    }
  } catch (err) {
    console.error("[Sync] Failed to load mock servers:", err);
  }

  try {
    const { data: cookies } = await supabase
      .from("cookies")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID);

    if (cookies && (cookies as any[]).length > 0) {
      const mappedCookies = (cookies as any[]).map((c: any) => ({
        id: c.id,
        domain: c.domain,
        name: c.name,
        value: c.value,
        path: c.path || "/",
        secure: c.secure || false,
        httpOnly: c.http_only || false,
        expiresAt: c.expires_at,
        createdAt: new Date(c.created_at).getTime(),
      }));
      useCookieStore.setState({ cookies: mappedCookies });
    }
  } catch (err) {
    console.error("[Sync] Failed to load cookies:", err);
  }

  try {
    const { data: history } = await supabase
      .from("request_history")
      .select("*")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .order("created_at", { ascending: false })
      .limit(100);

    if (history && (history as any[]).length > 0) {
      const mappedHistory = (history as any[]).map((h: any) => ({
        id: h.id,
        method: h.method,
        url: h.url,
        status: h.status,
        time: h.response_time,
        timestamp: new Date(h.created_at).getTime(),
        size: 0,
      }));
      useRequestStore.setState({ history: mappedHistory });
    }
  } catch (err) {
    console.error("[Sync] Failed to load history:", err);
  }

  return collectionsLoaded;
}

// ============================================
// LOCALSTORAGE MIGRATION (non-UUID → UUID)
// ============================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export function migrateLocalStorageIds() {
  const idMap = new Map<string, string>();

  function getOrCreateUUID(oldId: string): string {
    if (isValidUUID(oldId)) return oldId;
    if (idMap.has(oldId)) return idMap.get(oldId)!;
    const newId = crypto.randomUUID();
    idMap.set(oldId, newId);
    return newId;
  }

  function migrateRequest(req: any): any {
    return { ...req, id: getOrCreateUUID(req.id) };
  }

  function migrateFolder(folder: any): any {
    return {
      ...folder,
      id: getOrCreateUUID(folder.id),
      requests: (folder.requests || []).map(migrateRequest),
      folders: (folder.folders || []).map(migrateFolder),
    };
  }

  // Migrate collections
  const collections = useCollectionStore.getState().collections;
  let needsMigration = false;

  for (const col of collections) {
    if (!isValidUUID(col.id)) { needsMigration = true; break; }
    for (const req of col.requests) {
      if (!isValidUUID(req.id)) { needsMigration = true; break; }
    }
    if (needsMigration) break;
  }

  if (!needsMigration) {
    console.log("[Migration] All IDs are valid UUIDs, no migration needed");
    return;
  }

  console.log("[Migration] Migrating non-UUID IDs to UUID format...");

  const migratedCollections = collections.map((col) => ({
    ...col,
    id: getOrCreateUUID(col.id),
    requests: col.requests.map(migrateRequest),
    folders: col.folders.map(migrateFolder),
  }));

  // Update active request ID if needed
  const state = useCollectionStore.getState();
  const newActiveId = state.activeRequestId ? (idMap.get(state.activeRequestId) || state.activeRequestId) : null;

  useCollectionStore.setState({
    collections: migratedCollections,
    activeRequestId: newActiveId,
    activeRequest: newActiveId ? findRequestById(migratedCollections, newActiveId) : null,
  });

  console.log("[Migration] Migrated", idMap.size, "IDs to UUID format");
}

function findRequestById(collections: Collection[], id: string): RequestItem | null {
  for (const col of collections) {
    const found = col.requests.find((r) => r.id === id);
    if (found) return found;
    const inFolder = findInFolders(col.folders, id);
    if (inFolder) return inFolder;
  }
  return null;
}

function findInFolders(folders: Folder[], id: string): RequestItem | null {
  for (const folder of folders) {
    const found = folder.requests.find((r) => r.id === id);
    if (found) return found;
    const inSub = findInFolders(folder.folders, id);
    if (inSub) return inSub;
  }
  return null;
}
