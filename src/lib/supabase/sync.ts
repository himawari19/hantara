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
    .single();

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
    .single();

  if (!data || !data.updated_at) return "local";

  const remoteTime = new Date(data.updated_at).getTime();
  const localTime = new Date(localUpdatedAt).getTime();

  return localTime >= remoteTime ? "local" : "remote";
}

// ============================================
// SYNC COLLECTIONS TO SUPABASE
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
  console.log("[Sync] Syncing", collections.length, "collections...");

  for (const collection of collections) {
    const { data: existingCol } = await supabase
      .from("collections")
      .select("id")
      .eq("id", collection.id)
      .single();

    if (existingCol) {
      const { error } = await supabase
        .from("collections")
        .update({ name: collection.name, updated_at: new Date().toISOString() })
        .eq("id", collection.id);
      if (error) console.error("[Sync] Collection update failed:", error);
    } else {
      const { error } = await supabase.from("collections").insert({
        id: collection.id,
        workspace_id: DEFAULT_WORKSPACE_ID,
        name: collection.name,
      });
      if (error) console.error("[Sync] Collection insert failed:", error);
    }

    await syncFolders(collection.id, collection.folders, null);
    await syncRequests(collection.id, null, collection.requests);
  }

  // Delete removed collections
  const { data: remoteCollections } = await supabase
    .from("collections")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteCollections) {
    const localIds = new Set(collections.map((c) => c.id));
    for (const remote of remoteCollections as any[]) {
      if (!localIds.has(remote.id)) {
        await supabase.from("collections").delete().eq("id", remote.id);
      }
    }
  }
}

async function syncFolders(collectionId: string, folders: Folder[], parentFolderId: string | null) {
  const supabase = getSyncClient();
  if (!supabase) return;

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];

    const { data: existing } = await supabase
      .from("folders")
      .select("id")
      .eq("id", folder.id)
      .single();

    if (existing) {
      await supabase
        .from("folders")
        .update({ name: folder.name, sort_order: i })
        .eq("id", folder.id);
    } else {
      await supabase.from("folders").insert({
        id: folder.id,
        collection_id: collectionId,
        parent_folder_id: parentFolderId,
        name: folder.name,
        sort_order: i,
      });
    }

    await syncFolders(collectionId, folder.folders, folder.id);
    await syncRequests(collectionId, folder.id, folder.requests);
  }
}

async function syncRequests(collectionId: string, folderId: string | null, requests: RequestItem[]) {
  const supabase = getSyncClient();
  if (!supabase) return;

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from("requests")
      .select("id, updated_at")
      .eq("id", req.id)
      .single();

    const requestData = {
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
    };

    if (existing) {
      // Conflict resolution: only update if local is newer
      const winner = await resolveConflict("requests", req.id, now);
      if (winner === "local") {
        const { error } = await supabase.from("requests").update(requestData).eq("id", req.id);
        if (error) console.error("[Sync] Request update failed:", req.name, error);
      }
    } else {
      const { error } = await supabase.from("requests").insert({ id: req.id, ...requestData });
      if (error) console.error("[Sync] Request insert failed:", req.name, error);
    }
  }
}

// ============================================
// SYNC ENVIRONMENTS TO SUPABASE
// ============================================

export async function syncEnvironmentsToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { environments, globals } = useEnvironmentStore.getState();

  for (const env of environments) {
    const { data: existing } = await supabase
      .from("environments")
      .select("id")
      .eq("id", env.id)
      .single();

    const envData = {
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: env.name,
      variables: env.variables,
      is_global: false,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("environments").update(envData).eq("id", env.id);
    } else {
      await supabase.from("environments").insert({ id: env.id, ...envData });
    }
  }

  // Sync globals
  const globalEnvId = "00000000-0000-0000-0000-000000000099";
  const { data: existingGlobal } = await supabase
    .from("environments")
    .select("id")
    .eq("id", globalEnvId)
    .single();

  const globalData = {
    workspace_id: DEFAULT_WORKSPACE_ID,
    name: "Globals",
    variables: globals,
    is_global: true,
    updated_at: new Date().toISOString(),
  };

  if (existingGlobal) {
    await supabase.from("environments").update(globalData).eq("id", globalEnvId);
  } else {
    await supabase.from("environments").insert({ id: globalEnvId, ...globalData });
  }
}

// ============================================
// SYNC FLOWS TO SUPABASE
// ============================================

export async function syncFlowsToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { flows } = useFlowStore.getState();

  for (const flow of flows) {
    const { data: existing } = await supabase
      .from("flows")
      .select("id")
      .eq("id", flow.id)
      .single();

    const flowData = {
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: flow.name,
      description: flow.description || "",
      steps: flow.steps,
      delay_between_requests: flow.delayBetweenRequests || 0,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("flows").update(flowData).eq("id", flow.id);
    } else {
      await supabase.from("flows").insert({ id: flow.id, ...flowData });
    }
  }

  const { data: remoteFlows } = await supabase
    .from("flows")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteFlows) {
    const localIds = new Set(flows.map((f) => f.id));
    for (const remote of remoteFlows as any[]) {
      if (!localIds.has(remote.id)) {
        await supabase.from("flows").delete().eq("id", remote.id);
      }
    }
  }
}

// ============================================
// SYNC MOCK SERVERS TO SUPABASE
// ============================================

export async function syncMockServersToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { servers } = useMockStore.getState();

  for (const server of servers) {
    const { data: existing } = await supabase
      .from("mock_servers")
      .select("id")
      .eq("id", server.id)
      .single();

    const serverData = {
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: server.name,
      base_path: server.baseUrl || `/mock/${server.id.slice(0, 8)}`,
      is_active: server.isActive,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from("mock_servers").update(serverData).eq("id", server.id);
    } else {
      await supabase.from("mock_servers").insert({ id: server.id, ...serverData });
    }

    for (const route of server.routes) {
      const { data: existingRoute } = await supabase
        .from("mock_routes")
        .select("id")
        .eq("id", route.id)
        .single();

      const routeData = {
        mock_server_id: server.id,
        method: route.method,
        path: route.path,
        response_status: route.responseStatus,
        response_headers: route.responseHeaders,
        response_body: route.responseBody,
        delay_ms: route.delayMs,
        is_active: route.isActive,
      };

      if (existingRoute) {
        await supabase.from("mock_routes").update(routeData).eq("id", route.id);
      } else {
        await supabase.from("mock_routes").insert({ id: route.id, ...routeData });
      }
    }
  }

  const { data: remoteServers } = await supabase
    .from("mock_servers")
    .select("id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  if (remoteServers) {
    const localIds = new Set(servers.map((s) => s.id));
    for (const remote of remoteServers as any[]) {
      if (!localIds.has(remote.id)) {
        await supabase.from("mock_servers").delete().eq("id", remote.id);
      }
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
// SYNC HISTORY TO SUPABASE
// ============================================

export async function syncHistoryToSupabase() {
  const supabase = getSyncClient();
  if (!supabase) return;

  const { history } = useRequestStore.getState();

  for (const item of history.slice(0, 50)) {
    const { data: existing } = await supabase
      .from("request_history")
      .select("id")
      .eq("id", item.id)
      .single();

    if (!existing) {
      await supabase.from("request_history").insert({
        id: item.id,
        user_id: DEFAULT_USER_ID,
        workspace_id: DEFAULT_WORKSPACE_ID,
        method: item.method,
        url: item.url,
        status: item.status,
        response_time: item.time,
      });
    }
  }
}

// ============================================
// AUTO-SYNC (debounced + partial + retry)
// ============================================

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncToSupabase() {
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
      console.log("[Sync] Sync completed successfully");
    } catch (err) {
      console.error("[Sync] Sync failed:", err);
      useSyncStore.getState().setError(err instanceof Error ? err.message : "Sync failed");
    }
  }, 2000);
}

// ============================================
// REALTIME SUBSCRIPTION (multi-device sync)
// ============================================

let realtimeChannel: any = null;
let isReceivingRemote = false;

export function subscribeToRealtime() {
  const supabase = getSyncClient();
  if (!supabase) return;

  // Unsubscribe existing
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("workspace-sync")
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "collections",
      filter: `workspace_id=eq.${DEFAULT_WORKSPACE_ID}`,
    }, handleRealtimeChange)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "requests",
    }, handleRealtimeChange)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "folders",
    }, handleRealtimeChange)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "environments",
      filter: `workspace_id=eq.${DEFAULT_WORKSPACE_ID}`,
    }, handleRealtimeChange)
    .subscribe((status: string) => {
      console.log("[Realtime] Subscription status:", status);
    });
}

export function unsubscribeFromRealtime() {
  const supabase = getSyncClient();
  if (!supabase || !realtimeChannel) return;
  supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
}

// Debounced reload from remote on realtime change
let realtimeReloadTimeout: ReturnType<typeof setTimeout> | null = null;

function handleRealtimeChange(payload: any) {
  // Ignore changes we just made ourselves
  if (isReceivingRemote) return;

  console.log("[Realtime] Change detected:", payload.table, payload.eventType);

  // Debounce reload to avoid rapid-fire updates
  if (realtimeReloadTimeout) clearTimeout(realtimeReloadTimeout);
  realtimeReloadTimeout = setTimeout(async () => {
    isReceivingRemote = true;
    try {
      await loadFromSupabase();
      console.log("[Realtime] Reloaded data from remote");
    } finally {
      // Reset flag after a short delay to allow sync to settle
      setTimeout(() => { isReceivingRemote = false; }, 3000);
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
