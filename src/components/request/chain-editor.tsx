"use client";

import { useState } from "react";
import { useChainStore, ChainVariable } from "@/store/chain-store";
import { useCollectionStore } from "@/store/collection-store";
import { Plus, Trash2, Link, Variable } from "lucide-react";

export function ChainEditor() {
  const { chainVariables, extractions, addExtraction, removeExtraction, updateExtraction, clearChainVariables } =
    useChainStore();
  const { collections } = useCollectionStore();

  // Flatten all requests for selection
  const allRequests = getAllRequestsFlat(collections);

  const [newKey, setNewKey] = useState("");
  const [newSource, setNewSource] = useState("response.body.");
  const [newRequestId, setNewRequestId] = useState("");

  const handleAdd = () => {
    if (!newKey.trim() || !newSource.trim() || !newRequestId) return;
    addExtraction({ key: newKey.trim(), source: newSource.trim(), value: "", requestId: newRequestId });
    setNewKey("");
    setNewSource("response.body.");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Info */}
      <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Link size={14} className="text-[var(--accent)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">Request Chaining</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Extract values from responses and use them in subsequent requests.
          Use <code className="rounded bg-[var(--bg-secondary)] px-1">{"{{chain.variableName}}"}</code> in URLs, headers, or body.
        </p>
      </div>

      {/* Current Chain Variables */}
      {Object.keys(chainVariables).length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
              <Variable size={12} /> Active Variables ({Object.keys(chainVariables).length})
            </h4>
            <button
              type="button"
              onClick={clearChainVariables}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--error)]"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
            {Object.entries(chainVariables).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[var(--info)]">{"{{chain." + key + "}}"}</span>
                <span className="text-[var(--text-secondary)]">=</span>
                <span className="max-w-[200px] truncate font-mono text-[var(--success)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extraction Rules */}
      <div>
        <h4 className="mb-2 text-xs font-medium text-[var(--text-primary)]">Extraction Rules</h4>

        {extractions.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {extractions.map((ext) => {
              const request = allRequests.find((r) => r.id === ext.requestId);
              return (
                <div key={ext.key} className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2">
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-medium text-[var(--info)]">{ext.key}</span>
                      <span className="text-[var(--text-secondary)]">←</span>
                      <span className="font-mono text-[var(--text-secondary)]">{ext.source}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      From: {request?.name || "Unknown request"}
                    </span>
                  </div>
                  {chainVariables[ext.key] && (
                    <span className="max-w-[100px] truncate rounded bg-green-900/20 px-2 py-0.5 text-[10px] text-[var(--success)]">
                      {chainVariables[ext.key]}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExtraction(ext.key)}
                    className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                    aria-label="Remove extraction"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Extraction */}
        <div className="flex flex-col gap-2 rounded border border-dashed border-[var(--border)] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Variable name (e.g. token)"
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Source path (e.g. response.body.data.token)"
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={newRequestId}
              onChange={(e) => setNewRequestId(e.target.value)}
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Select source request"
            >
              <option value="">Select source request...</option>
              {allRequests.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.method} {req.name || req.url}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newKey.trim() || !newRequestId}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Help */}
      <details className="rounded border border-[var(--border)]">
        <summary className="cursor-pointer px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Source path examples
        </summary>
        <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-col gap-1 font-mono">
            <span>response.body.token</span>
            <span>response.body.data.id</span>
            <span>response.body.users[0].name</span>
            <span>response.headers.authorization</span>
            <span>response.headers.x-request-id</span>
          </div>
        </div>
      </details>
    </div>
  );
}

function getAllRequestsFlat(collections: any[]): { id: string; name: string; method: string; url: string }[] {
  const results: any[] = [];
  function collect(items: any[]) {
    items.forEach((item) => {
      if (item.requests) {
        item.requests.forEach((r: any) => results.push(r));
      }
      if (item.folders) collect(item.folders);
    });
  }
  collections.forEach((col) => {
    col.requests?.forEach((r: any) => results.push(r));
    if (col.folders) collect(col.folders);
  });
  return results;
}
