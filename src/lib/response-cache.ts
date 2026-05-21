/**
 * Response Cache — stores last response per request ID in IndexedDB.
 * 
 * When switching tabs, the cached response is shown instantly without
 * needing to re-send the request. This is especially useful for large
 * response bodies that would be expensive to re-fetch.
 */

import type { ResponseData } from "@/store/response-store";

const DB_NAME = "hantara-response-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";
const MAX_CACHE_ENTRIES = 200;
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB max per cached body

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "requestId" });
        store.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

interface CachedResponse {
  requestId: string;
  response: ResponseData;
  cachedAt: number;
}

/**
 * Cache a response for a given request ID.
 * Truncates body if too large to avoid bloating IndexedDB.
 */
export async function cacheResponse(requestId: string, response: ResponseData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Truncate body if too large
    const cachedResponse: ResponseData = {
      ...response,
      body: response.body.length > MAX_BODY_SIZE
        ? response.body.slice(0, MAX_BODY_SIZE) + "\n\n[... Cached response truncated]"
        : response.body,
    };

    const entry: CachedResponse = {
      requestId,
      response: cachedResponse,
      cachedAt: Date.now(),
    };

    store.put(entry);

    // Evict old entries if over limit
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > MAX_CACHE_ENTRIES) {
        const idx = store.index("cachedAt");
        const cursor = idx.openCursor();
        let deleted = 0;
        const toDelete = countReq.result - MAX_CACHE_ENTRIES;

        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < toDelete) {
            c.delete();
            deleted++;
            c.continue();
          }
        };
      }
    };
  } catch {
    // Silently fail — cache is best-effort
  }
}

/**
 * Get cached response for a request ID.
 * Returns null if not cached or cache is expired (>24h).
 */
export async function getCachedResponse(requestId: string): Promise<ResponseData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(requestId);
      request.onsuccess = () => {
        const entry = request.result as CachedResponse | undefined;
        if (!entry) { resolve(null); return; }

        // Expire after 24 hours
        const age = Date.now() - entry.cachedAt;
        if (age > 24 * 60 * 60 * 1000) { resolve(null); return; }

        resolve(entry.response);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Clear all cached responses.
 */
export async function clearResponseCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Silently fail
  }
}
