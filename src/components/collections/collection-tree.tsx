"use client";

import { useState } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { AddRequestDialog } from "./add-request-dialog";

export function CollectionTree() {
  const { collections, activeRequestId, setActiveRequest, addCollection } =
    useCollectionStore();

  return (
    <div className="flex flex-col gap-1">
      {/* Add Collection Button */}
      <button
        type="button"
        onClick={() => addCollection("New Collection")}
        className="mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Collection
      </button>

      {/* Collection List */}
      {collections.map((collection) => (
        <CollectionItem
          key={collection.id}
          collection={collection}
          activeRequestId={activeRequestId}
          onSelectRequest={setActiveRequest}
        />
      ))}

      {collections.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-[var(--text-secondary)]">
          No collections yet. Create one to get started.
        </p>
      )}
    </div>
  );
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
  const { toggleCollection, renameCollection, removeCollection, addFolder, addRequest } =
    useCollectionStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);

  const handleRename = () => {
    if (editName.trim()) {
      renameCollection(collection.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="group">
      <div className="flex items-center">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-1.5 px-2 py-1.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              className="w-full rounded bg-[var(--bg-tertiary)] px-1 text-sm text-[var(--text-primary)] outline-none"
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
            <svg
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${collection.isOpen ? "rotate-90" : ""}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <span className="truncate">{collection.name}</span>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 z-50 w-40 rounded border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setShowAddRequest(true); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Add Request
              </button>
              <button
                type="button"
                onClick={() => { addFolder(collection.id, null, "New Folder"); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Add Folder
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
                onClick={() => { removeCollection(collection.id); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--bg-tertiary)]"
              >
                Delete
              </button>
            </div>
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

      {/* Add Request Dialog */}
      {showAddRequest && (
        <AddRequestDialog
          onAdd={(data) => addRequest(collection.id, null, { name: data.name, method: data.method as any, url: data.url })}
          onClose={() => setShowAddRequest(false)}
        />
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
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
              className="w-full rounded bg-[var(--bg-tertiary)] px-1 text-sm text-[var(--text-primary)] outline-none"
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
            <svg
              xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${folder.isOpen ? "rotate-90" : ""}`}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-5 z-50 w-36 rounded border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                type="button"
                onClick={() => { setShowAddRequest(true); setShowMenu(false); }}
                className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Add Request
              </button>
              <button
                type="button"
                onClick={() => { addFolder(collectionId, folder.id, "Sub Folder"); setShowMenu(false); }}
                className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Add Sub Folder
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
                onClick={() => { removeFolder(collectionId, folder.id); setShowMenu(false); }}
                className="flex w-full px-3 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--bg-tertiary)]"
              >
                Delete
              </button>
            </div>
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

      {/* Add Request Dialog */}
      {showAddRequest && (
        <AddRequestDialog
          onAdd={(data) => addRequest(collectionId, folder.id, { name: data.name, method: data.method as any, url: data.url })}
          onClose={() => setShowAddRequest(false)}
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
  const { removeRequest } = useCollectionStore();
  const { openTab } = useTabStore();
  const { setMethod, setUrl, setHeaders, setBody, setBodyType } = useRequestStore();

  const handleSelect = () => {
    onSelect();
    // Open tab
    openTab({
      id: request.id,
      requestId: request.id,
      name: request.name || request.url || "Untitled",
      method: request.method,
      collectionName: collectionName || "Collection",
    });
    // Load request data into request store
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers);
    setBody(request.body);
    setBodyType(request.bodyType);
  };

  return (
    <div className="group/req flex items-center">
      <button
        type="button"
        onClick={handleSelect}
        className={`flex flex-1 items-center gap-2 rounded px-2 py-1 text-left text-sm ${
          isActive
            ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        }`}
      >
        <MethodBadge method={request.method} />
        <span className="truncate text-xs">{request.name || request.url || "Untitled"}</span>
      </button>
      <button
        type="button"
        onClick={() => removeRequest(request.id)}
        className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:text-[var(--error)] group-hover/req:opacity-100"
        aria-label="Delete request"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
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
