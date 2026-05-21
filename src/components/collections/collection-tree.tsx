"use client";

import { useState } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { AddRequestDialog } from "./add-request-dialog";
import { ChevronRight, Folder as FolderIcon, FolderOpen, MoreVertical, Plus, Trash2, Copy, Download, Play, Pencil, Settings } from "lucide-react";
import { CollectionRunner } from "./collection-runner";
import { CollectionSettings } from "./collection-settings";
import { FolderSettings } from "./folder-settings";

interface CollectionTreeProps {
  searchQuery?: string;
}

export function CollectionTree({ searchQuery = "" }: CollectionTreeProps) {
  const { collections, activeRequestId, setActiveRequest, addCollection } =
    useCollectionStore();

  // Filter collections based on search
  const filteredCollections = searchQuery.trim()
    ? filterCollections(collections, searchQuery.toLowerCase())
    : collections;

  return (
    <div className="flex flex-col gap-1">
      {/* Add Collection Button */}
      <button
        type="button"
        onClick={() => addCollection("New Collection")}
        className="mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <Plus size={14} />
        New Collection
      </button>

      {/* Collection List */}
      {filteredCollections.map((collection) => (
        <CollectionItem
          key={collection.id}
          collection={collection}
          activeRequestId={activeRequestId}
          onSelectRequest={setActiveRequest}
        />
      ))}

      {filteredCollections.length === 0 && !searchQuery && (
        <p className="px-2 py-4 text-center text-xs text-[var(--text-secondary)]">
          No collections yet. Create one to get started.
        </p>
      )}

      {filteredCollections.length === 0 && searchQuery && (
        <p className="px-2 py-4 text-center text-xs text-[var(--text-secondary)]">
          No results for &quot;{searchQuery}&quot;
        </p>
      )}
    </div>
  );
}

function filterCollections(collections: Collection[], query: string): Collection[] {
  return collections
    .map((col) => {
      const matchingRequests = col.requests.filter(
        (r) => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)
      );
      const matchingFolders = filterFolders(col.folders, query);
      const collectionMatches = col.name.toLowerCase().includes(query);

      if (collectionMatches || matchingRequests.length > 0 || matchingFolders.length > 0) {
        return {
          ...col,
          isOpen: true,
          requests: collectionMatches ? col.requests : matchingRequests,
          folders: collectionMatches ? col.folders : matchingFolders,
        };
      }
      return null;
    })
    .filter(Boolean) as Collection[];
}

function filterFolders(folders: Folder[], query: string): Folder[] {
  return folders
    .map((folder) => {
      const matchingRequests = folder.requests.filter(
        (r) => r.name.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)
      );
      const matchingSubFolders = filterFolders(folder.folders, query);
      const folderMatches = folder.name.toLowerCase().includes(query);

      if (folderMatches || matchingRequests.length > 0 || matchingSubFolders.length > 0) {
        return {
          ...folder,
          isOpen: true,
          requests: folderMatches ? folder.requests : matchingRequests,
          folders: folderMatches ? folder.folders : matchingSubFolders,
        };
      }
      return null;
    })
    .filter(Boolean) as Folder[];
}

function CollectionItem({
  collection,
  activeRequestId,
  onSelectRequest,
}: {
  collection: Collection;
  activeRequestId: string | null;
  onSelectRequest: (id: string) => void;
}) {
  const { toggleCollection, renameCollection, removeCollection, addFolder, addRequest, duplicateRequest } =
    useCollectionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleRename = () => {
    if (editName.trim()) {
      renameCollection(collection.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleExport = () => {
    const data = JSON.stringify(collection, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  return (
    <div className="collection-item group">
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1.5 px-2 py-1.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsEditing(false); }}
              className="w-full rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-sm text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
              autoFocus
              aria-label="Collection name"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleCollection(collection.id)}
            className="flex flex-1 items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          >
            <ChevronRight
              size={12}
              className={`transition-transform ${collection.isOpen ? "rotate-90" : ""}`}
            />
            {collection.isOpen ? <FolderOpen size={14} /> : <FolderIcon size={14} />}
            <span className="truncate">{collection.name}</span>
            <span className="ml-auto text-[10px] text-[var(--text-secondary)]">
              {countRequests(collection)}
            </span>
          </button>
        )}

        {/* Context Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 text-[var(--text-secondary)] opacity-0 hover:bg-[var(--bg-tertiary)] group-hover:opacity-100"
            aria-label="Collection menu"
          >
            <MoreVertical size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-50 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { setShowAddRequest(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Plus size={12} /> Add Request
                </button>
                <button
                  type="button"
                  onClick={() => { addFolder(collection.id, null, "New Folder"); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <FolderIcon size={12} /> Add Folder
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Download size={12} /> Export
                </button>
                <button
                  type="button"
                  onClick={() => { setShowSettings(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Pencil size={12} /> Settings
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRunner(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Play size={12} /> Run Collection
                </button>
                <div className="my-1 border-t border-[var(--border)]" />
                <button
                  type="button"
                  onClick={() => { removeCollection(collection.id); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--bg-tertiary)]"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Children */}
      {collection.isOpen && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-[var(--border)] pl-2">
          {collection.folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collectionId={collection.id}
              collectionName={collection.name}
              activeRequestId={activeRequestId}
              onSelectRequest={onSelectRequest}
            />
          ))}
          {collection.requests.map((req) => (
            <RequestItemRow
              key={req.id}
              request={req}
              isActive={activeRequestId === req.id}
              onSelect={() => onSelectRequest(req.id)}
              collectionName={collection.name}
            />
          ))}
        </div>
      )}

      {showAddRequest && (
        <AddRequestDialog
          onAdd={(data) => addRequest(collection.id, null, { name: data.name, method: data.method as any, url: data.url })}
          onClose={() => setShowAddRequest(false)}
        />
      )}

      {showRunner && (
        <CollectionRunner collectionId={collection.id} onClose={() => setShowRunner(false)} />
      )}

      {showSettings && (
        <CollectionSettings collectionId={collection.id} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function FolderItem({
  folder,
  collectionId,
  collectionName,
  activeRequestId,
  onSelectRequest,
}: {
  folder: Folder;
  collectionId: string;
  collectionName: string;
  activeRequestId: string | null;
  onSelectRequest: (id: string) => void;
}) {
  const { toggleFolder, renameFolder, removeFolder, addRequest, addFolder } =
    useCollectionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [showFolderSettings, setShowFolderSettings] = useState(false);

  const handleRename = () => {
    if (editName.trim()) {
      renameFolder(collectionId, folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="group/folder">
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1.5 px-2 py-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsEditing(false); }}
              className="w-full rounded bg-[var(--bg-tertiary)] px-1 text-sm text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
              autoFocus
              aria-label="Folder name"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => toggleFolder(collectionId, folder.id)}
            className="flex flex-1 items-center gap-1.5 rounded px-2 py-1 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          >
            <ChevronRight
              size={10}
              className={`transition-transform ${folder.isOpen ? "rotate-90" : ""}`}
            />
            {folder.isOpen ? <FolderOpen size={12} /> : <FolderIcon size={12} />}
            <span className="truncate text-xs">{folder.name}</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:bg-[var(--bg-tertiary)] group-hover/folder:opacity-100"
            aria-label="Folder menu"
          >
            <MoreVertical size={12} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-5 z-50 w-40 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => { setShowAddRequest(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Plus size={12} /> Add Request
                </button>
                <button
                  type="button"
                  onClick={() => { addFolder(collectionId, folder.id, "Sub Folder"); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <FolderIcon size={12} /> Add Sub Folder
                </button>
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => { setShowFolderSettings(true); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Settings size={12} /> Settings
                </button>
                <div className="my-1 border-t border-[var(--border)]" />
                <button
                  type="button"
                  onClick={() => { removeFolder(collectionId, folder.id); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--bg-tertiary)]"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {folder.isOpen && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-[var(--border)] pl-2">
          {folder.folders.map((sub) => (
            <FolderItem
              key={sub.id}
              folder={sub}
              collectionId={collectionId}
              collectionName={collectionName}
              activeRequestId={activeRequestId}
              onSelectRequest={onSelectRequest}
            />
          ))}
          {folder.requests.map((req) => (
            <RequestItemRow
              key={req.id}
              request={req}
              isActive={activeRequestId === req.id}
              onSelect={() => onSelectRequest(req.id)}
              collectionName={collectionName}
            />
          ))}
        </div>
      )}

      {showAddRequest && (
        <AddRequestDialog
          onAdd={(data) => addRequest(collectionId, folder.id, { name: data.name, method: data.method as any, url: data.url })}
          onClose={() => setShowAddRequest(false)}
        />
      )}

      {showFolderSettings && (
        <FolderSettings
          collectionId={collectionId}
          folderId={folder.id}
          folderName={folder.name}
          onClose={() => setShowFolderSettings(false)}
        />
      )}
    </div>
  );
}

function RequestItemRow({
  request,
  isActive,
  onSelect,
  collectionName,
}: {
  request: RequestItem;
  isActive: boolean;
  onSelect: () => void;
  collectionName?: string;
}) {
  const { removeRequest, duplicateRequest, updateRequest } = useCollectionStore();
  const { openTab } = useTabStore();
  const { setMethod, setUrl, setHeaders, setBody, setBodyType, setPreScript, setTestScript } = useRequestStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(request.name);

  const handleSelect = () => {
    onSelect();
    openTab({
      id: request.id,
      requestId: request.id,
      name: request.name || request.url || "Untitled",
      method: request.method,
      collectionName: collectionName || "Collection",
    });
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers);
    setBody(request.body);
    setBodyType(request.bodyType);
    setPreScript(request.preScript || "");
    setTestScript(request.testScript || "");
  };

  const handleRename = () => {
    if (editName.trim() && editName.trim() !== request.name) {
      updateRequest(request.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="group/req flex items-center">
      {isEditing ? (
        <div className="flex flex-1 items-center gap-2 px-2 py-1">
          <MethodBadge method={request.method} />
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setEditName(request.name); setIsEditing(false); }
            }}
            className="flex-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
            autoFocus
            aria-label="Request name"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSelect}
          onDoubleClick={() => setIsEditing(true)}
          className={`flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm ${
            isActive
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <MethodBadge method={request.method} />
          <span className="truncate text-xs">{request.name || request.url || "Untitled"}</span>
        </button>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:text-[var(--text-primary)] group-hover/req:opacity-100"
          aria-label="Request menu"
        >
          <MoreVertical size={12} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-5 z-50 w-36 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                type="button"
                onClick={() => { duplicateRequest(request.id); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <Copy size={12} /> Duplicate
              </button>
              <div className="my-1 border-t border-[var(--border)]" />
              <button
                type="button"
                onClick={() => { removeRequest(request.id); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--bg-tertiary)]"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-gray-400",
    OPTIONS: "text-cyan-400",
  };

  return (
    <span className={`min-w-[32px] text-[10px] font-bold ${colors[method] || "text-gray-400"}`}>
      {method}
    </span>
  );
}

function countRequests(collection: Collection): number {
  let count = collection.requests.length;
  function countInFolders(folders: Folder[]) {
    folders.forEach((f) => {
      count += f.requests.length;
      countInFolders(f.folders);
    });
  }
  countInFolders(collection.folders);
  return count;
}
