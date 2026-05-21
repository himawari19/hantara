/**
 * IndexedDB Storage Adapter for Zustand persist middleware.
 * 
 * Why: localStorage is limited to ~5-10MB and is synchronous (blocks main thread).
 * IndexedDB supports hundreds of MB, is async, and won't freeze the UI when
 * collections grow large (100+ requests, big response bodies, etc).
 * 
 * Falls back to localStorage if IndexedDB is unavailable.
 */

import { createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

const DB_NAME = "hantara-store";
const DB_VERSION = 1;
const STORE_NAME = "zustand";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn("[IDB] Failed to open IndexedDB, falling back to localStorage");
      reject(request.error);
    };
  });

  return dbPromise;
}

function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  });
}

const rawStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const store = await getStore("readonly");
      return new Promise((resolve, reject) => {
        const request = store.get(name);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback to localStorage
      return localStorage.getItem(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const store = await getStore("readwrite");
      return new Promise((resolve, reject) => {
        const request = store.put(value, name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback to localStorage
      localStorage.setItem(name, value);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const store = await getStore("readwrite");
      return new Promise((resolve, reject) => {
        const request = store.delete(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      localStorage.removeItem(name);
    }
  },
};

/**
 * Pre-built Zustand-compatible storage using createJSONStorage.
 * Use this in persist config: `storage: idbStorage`
 */
export const idbStorage = createJSONStorage(() => rawStorage);

/**
 * Migrate existing localStorage data to IndexedDB (one-time).
 * Call this early in app lifecycle.
 */
export async function migrateLocalStorageToIDB(): Promise<void> {
  const MIGRATION_KEY = "hantara-idb-migrated";
  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    const keysToMigrate = [
      "hantara-collections",
      "hantara-environments",
      "hantara-flows",
      "hantara-mock-servers",
      "hantara-cookies",
      "hantara-tabs",
      "hantara-theme",
      "hantara-openapi",
      "hantara-monitors",
      "hantara-chain",
      "hantara-pins",
      "hantara-versions",
    ];

    for (const key of keysToMigrate) {
      const value = localStorage.getItem(key);
      if (value) {
        await rawStorage.setItem(key, value);
      }
    }

    localStorage.setItem(MIGRATION_KEY, "1");
    console.log("[IDB] Migration from localStorage complete");
  } catch (err) {
    console.warn("[IDB] Migration failed, will continue using localStorage:", err);
  }
}
