import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface RequestItem {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  params: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "graphql";
  requestType: "http" | "websocket" | "graphql";
  preScript: string;
  testScript: string;
  authType: "none" | "bearer" | "basic" | "api-key" | "oauth2";
  authConfig: Record<string, string>;
}

export interface Folder {
  id: string;
  name: string;
  requests: RequestItem[];
  folders: Folder[];
  isOpen: boolean;
  auth?: { type: "none" | "bearer" | "basic" | "api-key" | "oauth2"; config: Record<string, string> };
  defaultHeaders?: { key: string; value: string; enabled: boolean }[];
  variables?: { key: string; value: string; enabled: boolean }[];
}

export interface Collection {
  id: string;
  name: string;
  requests: RequestItem[];
  folders: Folder[];
  isOpen: boolean;
  auth?: { type: "none" | "bearer" | "basic" | "api-key" | "oauth2"; config: Record<string, string> };
  defaultHeaders?: { key: string; value: string; enabled: boolean }[];
  variables?: { key: string; value: string; enabled: boolean }[];
}

interface CollectionState {
  collections: Collection[];
  activeRequestId: string | null;
  activeRequest: RequestItem | null;

  // Collection CRUD
  addCollection: (name: string) => void;
  removeCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  toggleCollection: (id: string) => void;

  // Folder CRUD
  addFolder: (collectionId: string, parentFolderId: string | null, name: string) => void;
  removeFolder: (collectionId: string, folderId: string) => void;
  renameFolder: (collectionId: string, folderId: string, name: string) => void;
  toggleFolder: (collectionId: string, folderId: string) => void;

  // Request CRUD
  addRequest: (collectionId: string, folderId: string | null, request?: Partial<RequestItem>) => void;
  removeRequest: (requestId: string) => void;
  updateRequest: (requestId: string, data: Partial<RequestItem>) => void;
  duplicateRequest: (requestId: string) => void;
  setActiveRequest: (id: string) => void;

  // Collection-level settings
  updateCollectionAuth: (collectionId: string, auth: Collection["auth"]) => void;
  updateCollectionVariables: (collectionId: string, variables: Collection["variables"]) => void;
  updateCollectionHeaders: (collectionId: string, headers: Collection["defaultHeaders"]) => void;
  updateFolderAuth: (collectionId: string, folderId: string, auth: Folder["auth"]) => void;
  updateFolderHeaders: (collectionId: string, folderId: string, headers: Folder["defaultHeaders"]) => void;

  // Inheritance helpers
  getInheritedAuth: (requestId: string) => { type: string; config: Record<string, string> } | null;
  getInheritedHeaders: (requestId: string) => { key: string; value: string; enabled: boolean }[];

  // Drag & Drop / Move
  moveRequest: (requestId: string, targetCollectionId: string, targetFolderId: string | null, targetIndex: number) => void;
  moveFolder: (collectionId: string, folderId: string, targetParentFolderId: string | null, targetIndex: number) => void;
  reorderRequests: (collectionId: string, folderId: string | null, requestIds: string[]) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createDefaultRequest(overrides?: Partial<RequestItem>): RequestItem {
  return {
    id: generateId(),
    name: "New Request",
    method: "GET",
    url: "",
    headers: [{ key: "", value: "", enabled: true }],
    params: [{ key: "", value: "", enabled: true }],
    body: "",
    bodyType: "none",
    requestType: "http",
    preScript: "",
    testScript: "",
    authType: "none",
    authConfig: {},
    ...overrides,
  };
}

// Deep search helpers
function findRequestInFolders(folders: Folder[], requestId: string): RequestItem | null {
  for (const folder of folders) {
    const found = folder.requests.find((r) => r.id === requestId);
    if (found) return found;
    const nested = findRequestInFolders(folder.folders, requestId);
    if (nested) return nested;
  }
  return null;
}

function findRequest(collections: Collection[], requestId: string): RequestItem | null {
  for (const collection of collections) {
    const found = collection.requests.find((r) => r.id === requestId);
    if (found) return found;
    const nested = findRequestInFolders(collection.folders, requestId);
    if (nested) return nested;
  }
  return null;
}

function updateRequestInFolders(folders: Folder[], requestId: string, data: Partial<RequestItem>): Folder[] {
  return folders.map((folder) => ({
    ...folder,
    requests: folder.requests.map((r) => (r.id === requestId ? { ...r, ...data } : r)),
    folders: updateRequestInFolders(folder.folders, requestId, data),
  }));
}

function removeRequestFromFolders(folders: Folder[], requestId: string): Folder[] {
  return folders.map((folder) => ({
    ...folder,
    requests: folder.requests.filter((r) => r.id !== requestId),
    folders: removeRequestFromFolders(folder.folders, requestId),
  }));
}

function addRequestToFolder(folders: Folder[], folderId: string, request: RequestItem): Folder[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return { ...folder, requests: [...folder.requests, request] };
    }
    return { ...folder, folders: addRequestToFolder(folder.folders, folderId, request) };
  });
}

function removeFolderById(folders: Folder[], folderId: string): Folder[] {
  return folders
    .filter((f) => f.id !== folderId)
    .map((f) => ({ ...f, folders: removeFolderById(f.folders, folderId) }));
}

function renameFolderById(folders: Folder[], folderId: string, name: string): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) return { ...f, name };
    return { ...f, folders: renameFolderById(f.folders, folderId, name) };
  });
}

function toggleFolderById(folders: Folder[], folderId: string): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) return { ...f, isOpen: !f.isOpen };
    return { ...f, folders: toggleFolderById(f.folders, folderId) };
  });
}

function addSubfolder(folders: Folder[], parentId: string, newFolder: Folder): Folder[] {
  return folders.map((f) => {
    if (f.id === parentId) {
      return { ...f, folders: [...f.folders, newFolder] };
    }
    return { ...f, folders: addSubfolder(f.folders, parentId, newFolder) };
  });
}

function updateFolderAuthById(folders: Folder[], folderId: string, auth: Folder["auth"]): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) return { ...f, auth };
    return { ...f, folders: updateFolderAuthById(f.folders, folderId, auth) };
  });
}

function updateFolderHeadersById(folders: Folder[], folderId: string, headers: Folder["defaultHeaders"]): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) return { ...f, defaultHeaders: headers };
    return { ...f, folders: updateFolderHeadersById(f.folders, folderId, headers) };
  });
}

// Find the path from collection root to a request (returns array of folders)
function findRequestPath(folders: Folder[], requestId: string, path: Folder[] = []): Folder[] | null {
  for (const folder of folders) {
    const found = folder.requests.find((r) => r.id === requestId);
    if (found) return [...path, folder];
    const nested = findRequestPath(folder.folders, requestId, [...path, folder]);
    if (nested) return nested;
  }
  return null;
}

function removeRequestFromFoldersWithReturn(folders: Folder[], requestId: string): { folders: Folder[]; found: RequestItem | null } {
  let found: RequestItem | null = null;
  const newFolders = folders.map((folder) => {
    const req = folder.requests.find((r) => r.id === requestId);
    if (req) {
      found = req;
      return { ...folder, requests: folder.requests.filter((r) => r.id !== requestId) };
    }
    const result = removeRequestFromFoldersWithReturn(folder.folders, requestId);
    if (result.found) found = result.found;
    return { ...folder, folders: result.folders };
  });
  return { folders: newFolders, found };
}

function insertRequestInFolder(folders: Folder[], folderId: string, request: RequestItem, index: number): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) {
      const newRequests = [...f.requests];
      newRequests.splice(index, 0, request);
      return { ...f, requests: newRequests };
    }
    return { ...f, folders: insertRequestInFolder(f.folders, folderId, request, index) };
  });
}

function removeFolderWithReturn(folders: Folder[], folderId: string): { folders: Folder[]; found: Folder | null } {
  let found: Folder | null = null;
  const filtered = folders.filter((f) => {
    if (f.id === folderId) { found = f; return false; }
    return true;
  });
  if (found) return { folders: filtered, found };
  const newFolders = filtered.map((f) => {
    const result = removeFolderWithReturn(f.folders, folderId);
    if (result.found) found = result.found;
    return { ...f, folders: result.folders };
  });
  return { folders: newFolders, found };
}

function insertFolderInParent(folders: Folder[], parentId: string, folder: Folder, index: number): Folder[] {
  return folders.map((f) => {
    if (f.id === parentId) {
      const newFolders = [...f.folders];
      newFolders.splice(index, 0, folder);
      return { ...f, folders: newFolders };
    }
    return { ...f, folders: insertFolderInParent(f.folders, parentId, folder, index) };
  });
}

function reorderRequestsInFolder(folders: Folder[], folderId: string, requestIds: string[]): Folder[] {
  return folders.map((f) => {
    if (f.id === folderId) {
      const reordered = requestIds.map((id) => f.requests.find((r) => r.id === id)).filter(Boolean) as RequestItem[];
      return { ...f, requests: reordered };
    }
    return { ...f, folders: reorderRequestsInFolder(f.folders, folderId, requestIds) };
  });
}

export const useCollectionStore = create<CollectionState>()(
  persist(
    (set, get) => ({
      collections: [],
      activeRequestId: null,
      activeRequest: null,

      addCollection: (name) => {
        const newCollection: Collection = {
          id: generateId(),
          name,
          requests: [],
          folders: [],
          isOpen: true,
        };
        set((state) => ({
          collections: [...state.collections, newCollection],
        }));
      },

      removeCollection: (id) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          activeRequestId: null,
          activeRequest: null,
        }));
      },

      renameCollection: (id, name) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        }));
      },

      toggleCollection: (id) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, isOpen: !c.isOpen } : c
          ),
        }));
      },

      addFolder: (collectionId, parentFolderId, name) => {
        const newFolder: Folder = {
          id: generateId(),
          name,
          requests: [],
          folders: [],
          isOpen: true,
        };
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (!parentFolderId) {
              return { ...c, folders: [...c.folders, newFolder] };
            }
            return { ...c, folders: addSubfolder(c.folders, parentFolderId, newFolder) };
          }),
        }));
      },

      removeFolder: (collectionId, folderId) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, folders: removeFolderById(c.folders, folderId) }
              : c
          ),
        }));
      },

      renameFolder: (collectionId, folderId, name) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, folders: renameFolderById(c.folders, folderId, name) }
              : c
          ),
        }));
      },

      toggleFolder: (collectionId, folderId) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, folders: toggleFolderById(c.folders, folderId) }
              : c
          ),
        }));
      },

      addRequest: (collectionId, folderId, overrides) => {
        const newRequest = createDefaultRequest(overrides);
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (!folderId) {
              return { ...c, requests: [...c.requests, newRequest] };
            }
            return { ...c, folders: addRequestToFolder(c.folders, folderId, newRequest) };
          }),
          activeRequestId: newRequest.id,
          activeRequest: newRequest,
        }));
      },

      removeRequest: (requestId) => {
        set((state) => {
          const collections = state.collections.map((c) => ({
            ...c,
            requests: c.requests.filter((r) => r.id !== requestId),
            folders: removeRequestFromFolders(c.folders, requestId),
          }));
          return {
            collections,
            activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
            activeRequest: state.activeRequestId === requestId ? null : state.activeRequest,
          };
        });
      },

      updateRequest: (requestId, data) => {
        set((state) => {
          const collections = state.collections.map((c) => ({
            ...c,
            requests: c.requests.map((r) => (r.id === requestId ? { ...r, ...data } : r)),
            folders: updateRequestInFolders(c.folders, requestId, data),
          }));
          const activeRequest = state.activeRequestId === requestId
            ? findRequest(collections, requestId)
            : state.activeRequest;
          return { collections, activeRequest };
        });
      },

      duplicateRequest: (requestId) => {
        const state = get();
        const original = findRequest(state.collections, requestId);
        if (!original) return;

        const duplicate: RequestItem = {
          ...original,
          id: generateId(),
          name: `${original.name} (copy)`,
        };

        // Find which collection contains this request and add duplicate there
        set((s) => ({
          collections: s.collections.map((c) => {
            const hasRequest = c.requests.some((r) => r.id === requestId);
            if (hasRequest) {
              return { ...c, requests: [...c.requests, duplicate] };
            }
            return c;
          }),
        }));
      },

      setActiveRequest: (id) => {
        const state = get();
        const request = findRequest(state.collections, id);
        set({ activeRequestId: id, activeRequest: request });
      },

      // Collection-level settings
      updateCollectionAuth: (collectionId, auth) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, auth } : c
          ),
        }));
      },

      updateCollectionVariables: (collectionId, variables) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, variables } : c
          ),
        }));
      },

      updateFolderAuth: (collectionId, folderId, auth) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            return { ...c, folders: updateFolderAuthById(c.folders, folderId, auth) };
          }),
        }));
      },

      updateCollectionHeaders: (collectionId, headers) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, defaultHeaders: headers } : c
          ),
        }));
      },

      updateFolderHeaders: (collectionId, folderId, headers) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            return { ...c, folders: updateFolderHeadersById(c.folders, folderId, headers) };
          }),
        }));
      },

      getInheritedAuth: (requestId) => {
        const state = get();
        for (const collection of state.collections) {
          // Check if request is at collection root
          const inRoot = collection.requests.find((r) => r.id === requestId);
          if (inRoot) {
            if (inRoot.authType !== "none") return null; // Request has its own auth
            if (collection.auth && collection.auth.type !== "none") return collection.auth;
            return null;
          }
          // Check in folders
          const path = findRequestPath(collection.folders, requestId);
          if (path) {
            // Walk from deepest folder up to collection
            for (let i = path.length - 1; i >= 0; i--) {
              const folder = path[i];
              if (folder.auth && folder.auth.type !== "none") return folder.auth;
            }
            if (collection.auth && collection.auth.type !== "none") return collection.auth;
            return null;
          }
        }
        return null;
      },

      getInheritedHeaders: (requestId) => {
        const state = get();
        const inherited: { key: string; value: string; enabled: boolean }[] = [];

        for (const collection of state.collections) {
          const inRoot = collection.requests.find((r) => r.id === requestId);
          if (inRoot) {
            if (collection.defaultHeaders) {
              inherited.push(...collection.defaultHeaders.filter((h) => h.enabled && h.key.trim()));
            }
            return inherited;
          }
          const path = findRequestPath(collection.folders, requestId);
          if (path) {
            // Collection headers first (lowest priority)
            if (collection.defaultHeaders) {
              inherited.push(...collection.defaultHeaders.filter((h) => h.enabled && h.key.trim()));
            }
            // Then folder headers (deeper = higher priority)
            for (const folder of path) {
              if (folder.defaultHeaders) {
                inherited.push(...folder.defaultHeaders.filter((h) => h.enabled && h.key.trim()));
              }
            }
            return inherited;
          }
        }
        return inherited;
      },

      // Drag & Drop
      moveRequest: (requestId, targetCollectionId, targetFolderId, targetIndex) => {
        set((state) => {
          // First, remove the request from its current location
          let movedRequest: RequestItem | null = null;
          const collections = state.collections.map((c) => {
            const reqInRoot = c.requests.find((r) => r.id === requestId);
            if (reqInRoot) {
              movedRequest = reqInRoot;
              return { ...c, requests: c.requests.filter((r) => r.id !== requestId) };
            }
            const { folders, found } = removeRequestFromFoldersWithReturn(c.folders, requestId);
            if (found) movedRequest = found;
            return { ...c, folders };
          });

          if (!movedRequest) return { collections: state.collections };

          // Then, add it to the target location
          const finalCollections = collections.map((c) => {
            if (c.id !== targetCollectionId) return c;
            if (!targetFolderId) {
              const newRequests = [...c.requests];
              newRequests.splice(targetIndex, 0, movedRequest!);
              return { ...c, requests: newRequests };
            }
            return { ...c, folders: insertRequestInFolder(c.folders, targetFolderId, movedRequest!, targetIndex) };
          });

          return { collections: finalCollections };
        });
      },

      moveFolder: (collectionId, folderId, targetParentFolderId, targetIndex) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            // Remove folder from current position
            let movedFolder: Folder | null = null;
            const withoutFolder = removeFolderWithReturn(c.folders, folderId);
            movedFolder = withoutFolder.found;
            if (!movedFolder) return c;

            // Insert at new position
            if (!targetParentFolderId) {
              const newFolders = [...withoutFolder.folders];
              newFolders.splice(targetIndex, 0, movedFolder);
              return { ...c, folders: newFolders };
            }
            return { ...c, folders: insertFolderInParent(withoutFolder.folders, targetParentFolderId, movedFolder, targetIndex) };
          }),
        }));
      },

      reorderRequests: (collectionId, folderId, requestIds) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (!folderId) {
              const reordered = requestIds.map((id) => c.requests.find((r) => r.id === id)).filter(Boolean) as RequestItem[];
              return { ...c, requests: reordered };
            }
            return { ...c, folders: reorderRequestsInFolder(c.folders, folderId, requestIds) };
          }),
        }));
      },
    }),
    {
      name: "hantara-collections",
      storage: idbStorage,
      version: 2,
      partialize: (state) => ({
        collections: state.collections,
        activeRequestId: state.activeRequestId,
      }),
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Migrate old requests to include new fields
          const state = persistedState as any;
          if (state.collections) {
            state.collections = state.collections.map((col: any) => ({
              ...col,
              requests: (col.requests || []).map(migrateRequest),
              folders: (col.folders || []).map(migrateFolder),
            }));
          }
        }
        return persistedState;
      },
    }
  )
);

function migrateRequest(req: any): any {
  return {
    ...req,
    params: req.params || [{ key: "", value: "", enabled: true }],
    requestType: req.requestType || "http",
    preScript: req.preScript || "",
    testScript: req.testScript || "",
    authType: req.authType || "none",
    authConfig: req.authConfig || {},
  };
}

function migrateFolder(folder: any): any {
  return {
    ...folder,
    requests: (folder.requests || []).map(migrateRequest),
    folders: (folder.folders || []).map(migrateFolder),
  };
}
