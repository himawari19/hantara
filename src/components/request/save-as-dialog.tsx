"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";
import { useCollectionStore } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { X, Copy, FolderOpen } from "lucide-react";

interface SaveAsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveAsDialog({ isOpen, onClose }: SaveAsDialogProps) {
  const { collections } = useCollectionStore();
  const [name, setName] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id || "");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim() || !selectedCollectionId) return;

    const { method, url, headers, body, bodyType, preScript, testScript } = useRequestStore.getState();

    useCollectionStore.getState().addRequest(selectedCollectionId, selectedFolderId, {
      name: name.trim(),
      method,
      url,
      headers,
      body,
      bodyType,
      preScript,
      testScript,
    });

    onClose();
    setName("");
  };

  // Flatten folders for selection
  const getFolderOptions = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return [];

    const options: { id: string; name: string; depth: number }[] = [];
    const traverse = (folders: any[], depth: number) => {
      for (const folder of folders) {
        options.push({ id: folder.id, name: folder.name, depth });
        if (folder.folders?.length) traverse(folder.folders, depth + 1);
      }
    };
    traverse(collection.folders, 0);
    return options;
  };

  const folderOptions = getFolderOptions(selectedCollectionId);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Copy size={16} className="text-[var(--accent)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Save as New Request</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3 p-4">
            {/* Name */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Request Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My New Request"
                className="w-full rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            {/* Collection */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Collection</label>
              <select
                value={selectedCollectionId}
                onChange={(e) => { setSelectedCollectionId(e.target.value); setSelectedFolderId(null); }}
                className="w-full rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Folder (optional) */}
            {folderOptions.length > 0 && (
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <FolderOpen size={10} />
                  Folder (optional)
                </label>
                <select
                  value={selectedFolderId || ""}
                  onChange={(e) => setSelectedFolderId(e.target.value || null)}
                  className="w-full rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                >
                  <option value="">Root (no folder)</option>
                  {folderOptions.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {"  ".repeat(folder.depth)}{folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || !selectedCollectionId}
              className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              <Copy size={12} />
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
