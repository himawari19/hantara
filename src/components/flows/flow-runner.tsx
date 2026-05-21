"use client";

import { useState } from "react";
import { useFlowStore, Flow, FlowStep } from "@/store/flow-store";
import { useCollectionStore } from "@/store/collection-store";

export function FlowRunner({ onClose }: { onClose: () => void }) {
  const { flows, addFlow, removeFlow, updateFlow, addStep, removeStep, runFlow, cancelRun, currentRun, isRunning } =
    useFlowStore();
  const { collections } = useCollectionStore();
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(flows[0]?.id || null);
  const [showAddStep, setShowAddStep] = useState(false);

  const selectedFlow = flows.find((f) => f.id === selectedFlowId);

  // Flatten all requests from collections for step selection
  const allRequests = collections.flatMap((c) => {
    const reqs = c.requests.map((r) => ({ ...r, collectionName: c.name, folderId: null }));
    const folderReqs = c.folders.flatMap((f) =>
      f.requests.map((r) => ({ ...r, collectionName: c.name, folderId: f.id }))
    );
    return [...reqs, ...folderReqs];
  });

  const handleAddStep = (requestId: string) => {
    const req = allRequests.find((r) => r.id === requestId);
    if (!req || !selectedFlowId) return;

    const step: FlowStep = {
      id: Math.random().toString(36).substring(2, 15),
      requestId: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      bodyType: req.bodyType,
      preScript: "",
      testScript: "",
    };

    addStep(selectedFlowId, step);
    setShowAddStep(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Flow List */}
        <div className="w-56 border-r border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--text-primary)]">Flows</span>
            <button
              type="button"
              onClick={() => addFlow("New Flow")}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Add flow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="overflow-auto">
            {flows.map((flow) => (
              <button
                key={flow.id}
                type="button"
                onClick={() => setSelectedFlowId(flow.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                  selectedFlowId === flow.id
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <span className="truncate">{flow.name}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{flow.steps.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Flow Detail */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {selectedFlow?.name || "Collection Runner"}
              </h2>
              {selectedFlow && (
                <input
                  type="text"
                  value={selectedFlow.name}
                  onChange={(e) => updateFlow(selectedFlow.id, { name: e.target.value })}
                  className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] outline-none"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedFlow && (
                <>
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={cancelRun}
                      className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runFlow(selectedFlow.id)}
                      disabled={selectedFlow.steps.length === 0}
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                    >
                      ▶ Run Flow
                    </button>
                  )}
                </>
              )}
              <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Flow Steps */}
          {selectedFlow ? (
            <div className="flex-1 overflow-auto p-4">
              {/* Delay Setting */}
              <div className="mb-4 flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Delay between requests:</label>
                <input
                  type="number"
                  value={selectedFlow.delayBetweenRequests}
                  onChange={(e) => updateFlow(selectedFlow.id, { delayBetweenRequests: parseInt(e.target.value) || 0 })}
                  className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                  min={0}
                />
                <span className="text-xs text-[var(--text-secondary)]">ms</span>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                {selectedFlow.steps.map((step, index) => {
                  const result = currentRun?.results.find((r) => r.stepId === step.id);
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 rounded border p-3 ${
                        result
                          ? result.passed
                            ? "border-green-600/30 bg-green-900/10"
                            : "border-red-600/30 bg-red-900/10"
                          : "border-[var(--border)] bg-[var(--bg-tertiary)]"
                      }`}
                    >
                      <span className="text-xs text-[var(--text-secondary)]">#{index + 1}</span>
                      <MethodBadge method={step.method} />
                      <span className="flex-1 truncate text-xs text-[var(--text-primary)]">
                        {step.name}
                      </span>
                      <span className="truncate text-[10px] text-[var(--text-secondary)]">
                        {step.url}
                      </span>
                      {result && (
                        <span className={`text-xs font-bold ${result.passed ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                          {result.status} • {result.time}ms
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeStep(selectedFlow.id, step.id)}
                        className="text-[var(--text-secondary)] hover:text-[var(--error)]"
                        aria-label="Remove step"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Step */}
              {showAddStep ? (
                <div className="mt-3 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                  <p className="mb-2 text-xs text-[var(--text-secondary)]">Select a request to add:</p>
                  <div className="max-h-[200px] overflow-auto">
                    {allRequests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => handleAddStep(req.id)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-primary)]"
                      >
                        <MethodBadge method={req.method} />
                        <span className="text-[var(--text-primary)]">{req.name}</span>
                        <span className="ml-auto text-[10px] text-[var(--text-secondary)]">{req.collectionName}</span>
                      </button>
                    ))}
                    {allRequests.length === 0 && (
                      <p className="py-2 text-center text-xs text-[var(--text-secondary)]">
                        No requests in collections. Create some first.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddStep(false)}
                    className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddStep(true)}
                  className="mt-3 flex items-center gap-2 rounded border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add Step
                </button>
              )}

              {/* Run Results Summary */}
              {currentRun && currentRun.flowId === selectedFlow.id && currentRun.status !== "running" && (
                <div className="mt-4 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${
                      currentRun.status === "completed" ? "text-[var(--success)]" : "text-[var(--error)]"
                    }`}>
                      {currentRun.status === "completed" ? "✓ All Passed" : currentRun.status === "failed" ? "✗ Some Failed" : "Cancelled"}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {currentRun.results.filter((r) => r.passed).length}/{currentRun.results.length} passed
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      Total: {currentRun.results.reduce((sum, r) => sum + r.time, 0)}ms
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-[var(--text-secondary)]">Create or select a flow to get started.</p>
            </div>
          )}
        </div>
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
  };
  return (
    <span className={`min-w-[32px] text-[10px] font-bold ${colors[method] || "text-gray-400"}`}>
      {method}
    </span>
  );
}
