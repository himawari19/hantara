"use client";

import { useState } from "react";
import { useEnvironmentStore } from "@/store/environment-store";

export function EnvironmentSelector() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
  } = useEnvironmentStore();
  const [showManager, setShowManager] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <select
        value={activeEnvironmentId || ""}
        onChange={(e) => setActiveEnvironment(e.target.value || null)}
        className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
        aria-label="Select environment"
      >
        <option value="">No Environment</option>
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowManager(!showManager)}
        className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="Manage environments"
        title="Manage environments"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => addEnvironment("New Environment")}
        className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="Add environment"
        title="Add environment"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Environment Manager Modal */}
      {showManager && <EnvironmentManager onClose={() => setShowManager(false)} />}
    </div>
  );
}

function EnvironmentManager({ onClose }: { onClose: () => void }) {
  const {
    environments,
    activeEnvironmentId,
    updateVariables,
    removeEnvironment,
    renameEnvironment,
  } = useEnvironmentStore();

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  if (!activeEnv) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-[var(--text-secondary)]">Select an environment first.</p>
        </div>
      </div>
    );
  }

  const updateVar = (index: number, field: "key" | "value" | "enabled", value: string | boolean) => {
    const newVars = [...activeEnv.variables];
    newVars[index] = { ...newVars[index], [field]: value };

    // Auto-add empty row
    const last = newVars[newVars.length - 1];
    if (last.key.trim() || last.value.trim()) {
      newVars.push({ key: "", value: "", enabled: true });
    }

    updateVariables(activeEnv.id, newVars);
  };

  const removeVar = (index: number) => {
    if (activeEnv.variables.length <= 1) return;
    const newVars = activeEnv.variables.filter((_, i) => i !== index);
    updateVariables(activeEnv.id, newVars);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Environment: {activeEnv.name}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close environment manager">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          Use <code className="rounded bg-[var(--bg-tertiary)] px-1">{"{{variable_name}}"}</code> in URLs, headers, and body to interpolate.
        </p>

        <div className="flex flex-col gap-2">
          {activeEnv.variables.map((v, i) => (
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
                placeholder="Variable name"
                className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              />
              <input
                type="text"
                value={v.value}
                onChange={(e) => updateVar(i, "value", e.target.value)}
                placeholder="Value"
                className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
              />
              <button
                type="button"
                onClick={() => removeVar(i)}
                className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label="Remove variable"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => removeEnvironment(activeEnv.id)}
            className="rounded bg-red-600/20 px-3 py-1.5 text-xs text-[var(--error)] hover:bg-red-600/30"
          >
            Delete Environment
          </button>
        </div>
      </div>
    </div>
  );
}
