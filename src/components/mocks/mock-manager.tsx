"use client";

import { useState } from "react";
import { useMockStore, MockServer, MockRoute } from "@/store/mock-store";

export function MockManager({ onClose }: { onClose: () => void }) {
  const { servers, addServer, removeServer, toggleServer, addRoute, removeRoute, updateRoute, toggleRoute } =
    useMockStore();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(servers[0]?.id || null);

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Server List */}
        <div className="w-56 border-r border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <span className="text-xs font-medium text-[var(--text-primary)]">Mock Servers</span>
            <button
              type="button"
              onClick={() => addServer("New Mock Server")}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Add mock server"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <div className="overflow-auto">
            {servers.map((server) => (
              <button
                key={server.id}
                type="button"
                onClick={() => setSelectedServerId(server.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs ${
                  selectedServerId === server.id
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${server.isActive ? "bg-green-400" : "bg-gray-500"}`} />
                <span className="truncate">{server.name}</span>
              </button>
            ))}
            {servers.length === 0 && (
              <p className="px-3 py-4 text-center text-[10px] text-[var(--text-secondary)]">
                No mock servers yet.
              </p>
            )}
          </div>
        </div>

        {/* Right: Server Detail */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              {selectedServer?.name || "Mock Server"}
            </h2>
            <div className="flex items-center gap-2">
              {selectedServer && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleServer(selectedServer.id)}
                    className={`rounded px-3 py-1 text-xs ${
                      selectedServer.isActive
                        ? "bg-green-900/20 text-green-400"
                        : "bg-gray-900/20 text-gray-400"
                    }`}
                  >
                    {selectedServer.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { removeServer(selectedServer.id); setSelectedServerId(null); }}
                    className="rounded px-2 py-1 text-xs text-[var(--error)] hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </>
              )}
              <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {selectedServer ? (
            <div className="flex-1 overflow-auto p-4">
              {/* Server Info */}
              <div className="mb-4 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
                <p className="text-xs text-[var(--text-secondary)]">
                  Base URL: <code className="rounded bg-[var(--bg-primary)] px-1 text-[var(--info)]">
                    {typeof window !== "undefined" ? window.location.origin : ""}/api/mock/{selectedServer.id}
                  </code>
                </p>
              </div>

              {/* Routes */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Routes ({selectedServer.routes.length})
                </span>
                <button
                  type="button"
                  onClick={() => addRoute(selectedServer.id)}
                  className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white hover:bg-[var(--accent-hover)]"
                >
                  Add Route
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {selectedServer.routes.map((route) => (
                  <MockRouteEditor
                    key={route.id}
                    route={route}
                    serverId={selectedServer.id}
                    onUpdate={(data) => updateRoute(selectedServer.id, route.id, data)}
                    onRemove={() => removeRoute(selectedServer.id, route.id)}
                    onToggle={() => toggleRoute(selectedServer.id, route.id)}
                  />
                ))}
                {selectedServer.routes.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--text-secondary)]">
                    No routes configured. Add one to start mocking.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-[var(--text-secondary)]">Select or create a mock server.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MockRouteEditor({
  route,
  serverId,
  onUpdate,
  onRemove,
  onToggle,
}: {
  route: MockRoute;
  serverId: string;
  onUpdate: (data: Partial<MockRoute>) => void;
  onRemove: () => void;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const methodColors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
  };

  return (
    <div className={`rounded border ${route.isActive ? "border-[var(--border)]" : "border-gray-700 opacity-60"} bg-[var(--bg-tertiary)]`}>
      {/* Route Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={() => setExpanded(!expanded)} className="text-[var(--text-secondary)]" aria-label={expanded ? "Collapse route" : "Expand route"}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <select
          value={route.method}
          onChange={(e) => onUpdate({ method: e.target.value as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" })}
          className={`rounded bg-[var(--bg-primary)] px-2 py-0.5 text-[10px] font-bold outline-none ${methodColors[route.method] || "text-gray-400"}`}
          aria-label="HTTP method"
          title="HTTP method"
        >
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={route.path}
          onChange={(e) => onUpdate({ path: e.target.value })}
          className="flex-1 rounded bg-[var(--bg-primary)] px-2 py-0.5 text-xs text-[var(--text-primary)] outline-none"
          placeholder="/path"
        />
        <span className="text-[10px] text-[var(--text-secondary)]">{route.responseStatus}</span>
        <button type="button" onClick={onToggle} className={`text-[10px] ${route.isActive ? "text-green-400" : "text-gray-500"}`}>
          {route.isActive ? "ON" : "OFF"}
        </button>
        <button type="button" onClick={onRemove} className="text-[var(--text-secondary)] hover:text-[var(--error)]" aria-label="Remove route">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-3">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-secondary)]">Status Code</span>
              <input
                type="number"
                value={route.responseStatus}
                onChange={(e) => onUpdate({ responseStatus: parseInt(e.target.value) || 200 })}
                className="rounded bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                aria-label="Status Code"
                placeholder="200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-[var(--text-secondary)]">Delay (ms)</span>
              <input
                type="number"
                value={route.delayMs}
                onChange={(e) => onUpdate({ delayMs: parseInt(e.target.value) || 0 })}
                className="rounded bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                min={0}
                aria-label="Delay (ms)"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-secondary)]">Response Body</span>
            <textarea
              value={route.responseBody}
              onChange={(e) => onUpdate({ responseBody: e.target.value })}
              className="h-24 w-full resize-none rounded bg-[var(--bg-primary)] p-2 font-mono text-[10px] text-[var(--text-primary)] outline-none"
              spellCheck={false}
              aria-label="Response Body"
              placeholder="{}"
            />
          </div>
        </div>
      )}
    </div>
  );
}
