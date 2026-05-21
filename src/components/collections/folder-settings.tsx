"use client";

import { useState } from "react";
import { useCollectionStore, Folder } from "@/store/collection-store";
import { X, Shield, FileText, Trash2 } from "lucide-react";

interface FolderSettingsProps {
  collectionId: string;
  folderId: string;
  folderName: string;
  onClose: () => void;
}

export function FolderSettings({ collectionId, folderId, folderName, onClose }: FolderSettingsProps) {
  const { collections, updateFolderAuth, updateFolderHeaders } = useCollectionStore();
  const [activeTab, setActiveTab] = useState<"auth" | "headers">("auth");

  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return null;

  // Find the folder
  const folder = findFolderById(collection.folders, folderId);
  if (!folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Folder Settings</h3>
            <p className="text-xs text-[var(--text-secondary)]">{folderName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab("auth")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs ${
              activeTab === "auth"
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Shield size={12} /> Authorization
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs ${
              activeTab === "headers"
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileText size={12} /> Default Headers
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-auto p-4">
          {activeTab === "auth" && (
            <FolderAuthEditor
              folder={folder}
              onUpdate={(auth) => updateFolderAuth(collectionId, folderId, auth)}
            />
          )}
          {activeTab === "headers" && (
            <FolderHeadersEditor
              folder={folder}
              onUpdate={(headers) => updateFolderHeaders(collectionId, folderId, headers)}
            />
          )}
        </div>

        {/* Info */}
        <div className="border-t border-[var(--border)] px-4 py-2">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Folder settings override collection settings and are inherited by all requests in this folder.
          </p>
        </div>
      </div>
    </div>
  );
}

function FolderAuthEditor({
  folder,
  onUpdate,
}: {
  folder: Folder;
  onUpdate: (auth: Folder["auth"]) => void;
}) {
  const auth = folder.auth || { type: "none" as const, config: {} };

  const setAuthType = (type: string) => {
    onUpdate({ type: type as any, config: auth.config });
  };

  const setConfig = (key: string, value: string) => {
    onUpdate({ type: auth.type, config: { ...auth.config, [key]: value } });
  };

  const authTypes = [
    { key: "none", label: "Inherit" },
    { key: "bearer", label: "Bearer Token" },
    { key: "basic", label: "Basic Auth" },
    { key: "api-key", label: "API Key" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--text-secondary)]">
        Set authorization for all requests in this folder. "Inherit" uses the parent collection's auth.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {authTypes.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setAuthType(t.key)}
            className={`rounded px-2.5 py-1 text-xs font-medium ${
              auth.type === t.key
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {auth.type === "bearer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Token</label>
          <input
            type="text"
            value={auth.config.token || ""}
            onChange={(e) => setConfig("token", e.target.value)}
            placeholder="Enter bearer token or {{variable}}"
            className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>
      )}

      {auth.type === "basic" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Username</label>
            <input
              type="text"
              value={auth.config.username || ""}
              onChange={(e) => setConfig("username", e.target.value)}
              placeholder="Username"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              value={auth.config.password || ""}
              onChange={(e) => setConfig("password", e.target.value)}
              placeholder="Password"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Key Name</label>
            <input
              type="text"
              value={auth.config.keyName || "X-API-Key"}
              onChange={(e) => setConfig("keyName", e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              aria-label="API key name"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Value</label>
            <input
              type="text"
              value={auth.config.keyValue || ""}
              onChange={(e) => setConfig("keyValue", e.target.value)}
              placeholder="API key value"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FolderHeadersEditor({
  folder,
  onUpdate,
}: {
  folder: Folder;
  onUpdate: (headers: Folder["defaultHeaders"]) => void;
}) {
  const headers = folder.defaultHeaders || [{ key: "", value: "", enabled: true }];

  const updateHeader = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };

    const last = newHeaders[newHeaders.length - 1];
    if (last.key.trim() || last.value.trim()) {
      newHeaders.push({ key: "", value: "", enabled: true });
    }

    onUpdate(newHeaders);
  };

  const removeHeader = (index: number) => {
    if (headers.length <= 1) return;
    onUpdate(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-secondary)]">
        Default headers for all requests in this folder. These override collection-level headers with the same key.
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-[10px] text-[var(--text-secondary)]">
          <span className="w-5"></span>
          <span>Header Name</span>
          <span>Value</span>
          <span className="w-6"></span>
        </div>
        {headers.map((h, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
            <input
              type="checkbox"
              checked={h.enabled}
              onChange={(e) => updateHeader(i, "enabled", e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              aria-label={`Enable header ${h.key || i + 1}`}
            />
            <input
              type="text"
              value={h.key}
              onChange={(e) => updateHeader(i, "key", e.target.value)}
              placeholder="Header name"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
            <input
              type="text"
              value={h.value}
              onChange={(e) => updateHeader(i, "value", e.target.value)}
              placeholder="Value"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
            <button
              type="button"
              onClick={() => removeHeader(i)}
              className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
              aria-label="Remove header"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function findFolderById(folders: Folder[], folderId: string): Folder | null {
  for (const folder of folders) {
    if (folder.id === folderId) return folder;
    const nested = findFolderById(folder.folders, folderId);
    if (nested) return nested;
  }
  return null;
}
