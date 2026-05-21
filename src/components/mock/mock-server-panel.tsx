"use client";

import { useState } from "react";
import { useMockStore, MockServer, MockRoute } from "@/store/mock-store";
import { Plus, Trash2, Server, Power, Copy, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="h-[150px] flex items-center justify-center text-xs text-[var(--text-secondary)]">Loading...</div>,
});

export function MockServerPanel() {
  const { servers, addServer } = useMockStore();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const selectedServer = servers.find((s) => s.id === selectedServerId);
  const selectedRoute = selectedServer?.routes.find((r) => r.id === selectedRouteId);

  return (
    <div className="flex h-full">
      {/* Server List */}
      <div className="w-56 border-r border-[var(--border)] flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">Mock Servers</span>
          <button
            type="button"
            onClick={() => addServer("New Server")}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Add mock server"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {servers.map((server) => (
            <ServerListItem
              key={server.id}
              server={server}
              isSelected={selectedServerId === server.id}
              onSelect={() => { setSelectedServerId(server.id); setSelectedRouteId(null); }}
            />
          ))}
          {servers.length === 0 && (
            <p className="p-3 text-center text-xs text-[var(--text-secondary)]">
              No mock servers. Create one to get started.
            </p>
          )}
        </div>
      </div>

      {/* Routes & Editor */}
      {selectedServer ? (
        <div className="flex flex-1 flex-col">
          {/* Server Header */}
          <ServerHeader server={selectedServer} />

          <div className="flex flex-1 overflow-hidden">
            {/* Route List */}
            <div className="w-64 border-r border-[var(--border)] flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <span className="text-xs text-[var(--text-secondary)]">Routes ({selectedServer.routes.length})</span>
                <button
                  type="button"
                  onClick={() => useMockStore.getState().addRoute(selectedServer.id)}
                  className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  aria-label="Add route"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {selectedServer.routes.map((route) => (
                  <RouteListItem
                    key={route.id}
                    route={route}
                    isSelected={selectedRouteId === route.id}
                    onSelect={() => setSelectedRouteId(route.id)}
                    serverId={selectedServer.id}
                  />
                ))}
              </div>
            </div>

            {/* Route Editor */}
            {selectedRoute ? (
              <RouteEditor serverId={selectedServer.id} route={selectedRoute} />
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-[var(--text-secondary)]">Select a route to edit</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Server size={40} className="text-[var(--text-secondary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">Select or create a mock server</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServerListItem({ server, isSelected, onSelect }: { server: MockServer; isSelected: boolean; onSelect: () => void }) {
  const { removeServer, toggleServer } = useMockStore();

  return (
    <div
      className={`group flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 cursor-pointer ${
        isSelected ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
      }`}
      onClick={onSelect}
    >
      <div className={`h-2 w-2 rounded-full ${server.isActive ? "bg-[var(--success)]" : "bg-[var(--text-secondary)]"}`} />
      <span className="flex-1 truncate text-xs text-[var(--text-primary)]">{server.name}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleServer(server.id); }}
        className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100"
        aria-label="Toggle server"
      >
        <Power size={12} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); removeServer(server.id); }}
        className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:text-[var(--error)] group-hover:opacity-100"
        aria-label="Delete server"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function ServerHeader({ server }: { server: MockServer }) {
  const { updateServer } = useMockStore();
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}${server.baseUrl}` : server.baseUrl;

  const copyUrl = () => navigator.clipboard.writeText(baseUrl);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2">
      <input
        type="text"
        value={server.name}
        onChange={(e) => updateServer(server.id, { name: e.target.value })}
        className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] outline-none"
      />
      <div className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-2 py-1">
        <span className="font-mono text-[10px] text-[var(--text-secondary)]">{baseUrl}</span>
        <button type="button" onClick={copyUrl} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Copy URL">
          <Copy size={12} />
        </button>
      </div>
      <div className={`ml-auto flex items-center gap-1 text-xs ${server.isActive ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}`}>
        <div className={`h-2 w-2 rounded-full ${server.isActive ? "bg-[var(--success)]" : "bg-[var(--text-secondary)]"}`} />
        {server.isActive ? "Active" : "Inactive"}
      </div>
    </div>
  );
}

function RouteListItem({ route, isSelected, onSelect, serverId }: { route: MockRoute; isSelected: boolean; onSelect: () => void; serverId: string }) {
  const { removeRoute } = useMockStore();
  const methodColors: Record<string, string> = {
    GET: "text-green-400", POST: "text-yellow-400", PUT: "text-blue-400", PATCH: "text-purple-400", DELETE: "text-red-400",
  };

  return (
    <div
      className={`group flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5 cursor-pointer ${
        isSelected ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
      }`}
      onClick={onSelect}
    >
      <span className={`min-w-[35px] text-[10px] font-bold ${methodColors[route.method] || "text-gray-400"}`}>
        {route.method}
      </span>
      <span className="flex-1 truncate font-mono text-xs text-[var(--text-primary)]">{route.path}</span>
      <span className="text-[10px] text-[var(--text-secondary)]">{route.responseStatus}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); removeRoute(serverId, route.id); }}
        className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:text-[var(--error)] group-hover:opacity-100"
        aria-label="Delete route"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

function RouteEditor({ serverId, route }: { serverId: string; route: MockRoute }) {
  const { updateRoute } = useMockStore();
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-4">
      <div className="flex flex-col gap-3">
        {/* Method + Path */}
        <div className="flex gap-2">
          <select
            value={route.method}
            onChange={(e) => updateRoute(serverId, route.id, { method: e.target.value as any })}
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
            aria-label="HTTP method"
          >
            {methods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            value={route.path}
            onChange={(e) => updateRoute(serverId, route.id, { path: e.target.value })}
            placeholder="/users/:id"
            className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>

        {/* Status + Delay */}
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Status:</label>
            <input
              type="number"
              value={route.responseStatus}
              onChange={(e) => updateRoute(serverId, route.id, { responseStatus: Number(e.target.value) })}
              className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Response status code"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Delay (ms):</label>
            <input
              type="number"
              value={route.delayMs}
              onChange={(e) => updateRoute(serverId, route.id, { delayMs: Number(e.target.value) })}
              min={0}
              className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Response delay in milliseconds"
            />
          </div>
        </div>

        {/* Response Body */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-secondary)]">Response Body</label>
          <div className="h-[200px] overflow-hidden rounded border border-[var(--border)]">
            <MonacoEditor
              height="200px"
              language="json"
              value={route.responseBody}
              onChange={(v) => updateRoute(serverId, route.id, { responseBody: v || "" })}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-secondary)]">Description</label>
          <input
            type="text"
            value={route.description}
            onChange={(e) => updateRoute(serverId, route.id, { description: e.target.value })}
            placeholder="What does this endpoint do?"
            className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>
      </div>
    </div>
  );
}
