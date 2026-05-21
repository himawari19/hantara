import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RequestItem {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: "none" | "json" | "form-data" | "raw";
}

export interface Folder {
  id: string;
  name: string;
  requests: RequestItem[];
  folders: Folder[];
  isOpen: boolean;
}

export interface Collection {
  id: string;
  name: string;
  requests: RequestItem[];
  folders: Folder[];
  isOpen: boolean;
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
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function createDefaultRequest(overrides?: Partial<RequestItem>): RequestItem {
  return {
    id: generateId(),
    name: "New Request",
    method: "GET",
    url: "",
    headers: [{ key: "", value: "", enabled: true }],
    body: "",
    bodyType: "none",
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
    }),
    {
      name: "hantara-collections",
    }
  )
);
