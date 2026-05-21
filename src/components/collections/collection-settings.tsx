"use client";

import { useState } from "react";
import { useCollectionStore, Collection } from "@/store/collection-store";
import { X, Shield, Variable, Plus, Trash2 } from "lucide-react";

interface CollectionSettingsProps {
  collectionId: string;
  onClose: () => void;
}

export function CollectionSettings({ collectionId, onClose }: CollectionSettingsProps) {
  const { collections, updateCollectionAuth, updateCollectionVariables } = useCollectionStore();
  const collection = collections.find((c) => c.id === collectionId);
  const [activeTab, setActiveTab] = useState<"auth" | "variables">("auth");

  if (!collection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Collection Settings</h3>
            <p className="text-xs text-[var(--text-secondary)]">{collection.name}</p>
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
            onClick={() => setActiveTab("variables")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs ${
              activeTab === "variables"
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Variable size={12} /> Variables
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-auto p-4">
          {activeTab === "auth" && (
            <CollectionAuthEditor collection={collection} onUpdate={updateCollectionAuth} />
          )}
          {activeTab === "variables" && (
            <CollectionVariablesEditor collection={collection} onUpdate={updateCollectionVariables} />
          )}
        </div>

        {/* Info */}
        <div className="border-t border-[var(--border)] px-4 py-2">
          <p className="text-[10px] text-[var(--text-secondary)]">
            These settings are inherited by all requests in this collection unless overridden.
          </p>
        </div>
      </div>
    </div>
  );
}

function CollectionAuthEditor({
  collection,
  onUpdate,
}: {
  collection: Collection;
  onUpdate: (id: string, auth: Collection["auth"]) => void;
}) {
  const auth = collection.auth || { type: "none" as const, config: {} };

  const setAuthType = (type: string) => {
    onUpdate(collection.id, { type: type as any, config: auth.config });
  };

  const setConfig = (key: string, value: string) => {
    onUpdate(collection.id, { type: auth.type, config: { ...auth.config, [key]: value } });
  };

  const authTypes = [
    { key: "none", label: "None" },
    { key: "bearer", label: "Bearer Token" },
    { key: "basic", label: "Basic Auth" },
    { key: "api-key", label: "API Key" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-[var(--text-secondary)]">
        Set default authorization for all requests in this collection. Individual requests can override this.
      </p>

      {/* Auth Type */}
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

      {/* Auth Config */}
      {auth.type === "bearer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Token</label>
          <input
            type="text"
            value={auth.config.token || ""}
            onChange={(e) => setConfig("token", e.target.value)}
            placeholder="Enter bearer token"
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

function CollectionVariablesEditor({
  collection,
  onUpdate,
}: {
  collection: Collection;
  onUpdate: (id: string, variables: Collection["variables"]) => void;
}) {
  const variables = collection.variables || [{ key: "", value: "", enabled: true }];

  const updateVar = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: value };

    // Auto-add empty row
    const last = newVars[newVars.length - 1];
    if (last.key.trim() || last.value.trim()) {
      newVars.push({ key: "", value: "", enabled: true });
    }

    onUpdate(collection.id, newVars);
  };

  const removeVar = (index: number) => {
    if (variables.length <= 1) return;
    onUpdate(collection.id, variables.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--text-secondary)]">
        Collection-level variables. Use <code className="rounded bg-[var(--bg-tertiary)] px-1">{"{{variable_name}}"}</code> in requests.
        These are scoped to this collection only.
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-[10px] text-[var(--text-secondary)]">
          <span className="w-5"></span>
          <span>Variable</span>
          <span>Value</span>
          <span className="w-6"></span>
        </div>
        {variables.map((v, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
            <input
              type="checkbox"
              checked={v.enabled}
              onChange={(e) => updateVar(i, "enabled", e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
              aria-label={`Enable variable ${v.key || i + 1}`}
            />
            <input
              type="text"
              value={v.key}
              onChange={(e) => updateVar(i, "key", e.target.value)}
              placeholder="Variable name"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
            <input
              type="text"
              value={v.value}
              onChange={(e) => updateVar(i, "value", e.target.value)}
              placeholder="Value"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
            <button
              type="button"
              onClick={() => removeVar(i)}
              className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
              aria-label="Remove variable"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
