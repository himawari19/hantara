"use client";

import { useState } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { Plus, Trash2 } from "lucide-react";

interface CollectionVariablesProps {
  collectionId: string;
  onClose: () => void;
}

export function CollectionVariables({ collectionId, onClose }: CollectionVariablesProps) {
  const { collections } = useCollectionStore();
  const collection = collections.find((c) => c.id === collectionId);

  const [variables, setVariables] = useState<{ key: string; value: string; enabled: boolean }[]>(
    collection?.variables?.length ? collection.variables : [{ key: "", value: "", enabled: true }]
  );

  const updateVar = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newVars = [...variables];
    newVars[index] = { ...newVars[index], [field]: value };

    // Auto-add empty row
    const last = newVars[newVars.length - 1];
    if (last && (last.key.trim() || last.value.trim())) {
      newVars.push({ key: "", value: "", enabled: true });
    }

    setVariables(newVars);
  };

  const removeVar = (index: number) => {
    if (variables.length <= 1) return;
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    useCollectionStore.getState().updateCollectionVariables?.(collectionId, variables);
    onClose();
  };

  if (!collection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[70vh] w-full max-w-lg overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Variables: {collection.name}
          </h3>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-[10px] text-[var(--text-secondary)]">
          Collection variables are available to all requests in this collection. Use {"{{variable_name}}"} to reference them.
          Priority: Collection &lt; Environment &lt; Global.
        </p>

        {/* Variable Table */}
        <div className="flex flex-col gap-2">
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
                className="h-4 w-4 accent-[var(--accent)]"
                aria-label={`Enable variable ${v.key || i + 1}`}
              />
              <input
                type="text"
                value={v.key}
                onChange={(e) => updateVar(i, "key", e.target.value)}
                placeholder="variable_name"
                className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              />
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateVar(i, "value", e.target.value)}
                placeholder="value"
                className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              />
              <button
                type="button"
                onClick={() => removeVar(i)}
                className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label="Remove variable"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Save Variables
          </button>
        </div>
      </div>
    </div>
  );
}
