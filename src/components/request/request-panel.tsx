"use client";

import { useRequestStore } from "@/store/request-store";
import { HeadersEditor } from "./headers-editor";
import { BodyEditor } from "./body-editor";
import { ParamsEditor } from "./params-editor";
import { AuthEditor } from "./auth-editor";
import { ScriptsTab } from "./scripts-tab";
import { ChainEditor } from "./chain-editor";
import { WebSocketPanel } from "./websocket-panel";
import { GraphQLPanel } from "./graphql-panel";
import { SSEPanel } from "./sse-panel";
import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type RequestMode = "http" | "websocket" | "graphql" | "sse";
type RequestTab = "params" | "headers" | "body" | "auth" | "pre-request" | "tests" | "chain";

export function RequestPanel() {
  const { method, url, headers, setMethod, setUrl, sendRequest, isLoading, cancelRequest } =
    useRequestStore();
  const [activeTab, setActiveTab] = useState<RequestTab>("params");
  const [requestMode, setRequestMode] = useState<RequestMode>("http");

  const methodColors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-gray-400",
    OPTIONS: "text-cyan-400",
  };

  const headerCount = headers.filter((h) => h.enabled && h.key.trim()).length;

  // WebSocket mode
  if (requestMode === "websocket") {
    return (
      <div className="flex h-full flex-col">
        <RequestModeSelector mode={requestMode} setMode={setRequestMode} />
        <WebSocketPanel />
      </div>
    );
  }

  // GraphQL mode
  if (requestMode === "graphql") {
    return (
      <div className="flex h-full flex-col">
        <RequestModeSelector mode={requestMode} setMode={setRequestMode} />
        <GraphQLPanel />
      </div>
    );
  }

  // SSE mode
  if (requestMode === "sse") {
    return (
      <div className="flex h-full flex-col">
        <RequestModeSelector mode={requestMode} setMode={setRequestMode} />
        <SSEPanel />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mode Selector */}
      <RequestModeSelector mode={requestMode} setMode={setRequestMode} />

      {/* URL Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className={`rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm font-bold outline-none ${methodColors[method] || "text-[var(--text-primary)]"}`}
          aria-label="HTTP method"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter request URL (supports {{variables}} and {{chain.var}})"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendRequest();
          }}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={cancelRequest}
            className="rounded bg-[var(--error)] px-5 py-2 text-sm font-bold text-white transition-colors hover:opacity-80"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={sendRequest}
            className="rounded bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Send
          </button>
        )}
      </div>

      {/* Request Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto">
        {([
          { key: "params", label: "Params" },
          { key: "headers", label: `Headers${headerCount > 0 ? ` (${headerCount})` : ""}` },
          { key: "body", label: "Body" },
          { key: "auth", label: "Auth" },
          { key: "pre-request", label: "Pre-request" },
          { key: "tests", label: "Tests" },
          { key: "chain", label: "Chain" },
        ] as { key: RequestTab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-4 py-2 text-sm ${
              activeTab === tab.key
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "params" && <ParamsEditor />}
        {activeTab === "headers" && <HeadersEditor />}
        {activeTab === "body" && <BodyEditor />}
        {activeTab === "auth" && <AuthEditor />}
        {activeTab === "pre-request" && <ScriptsTab type="pre-request" />}
        {activeTab === "tests" && <ScriptsTab type="tests" />}
        {activeTab === "chain" && <ChainEditor />}
      </div>
    </div>
  );
}

function RequestModeSelector({ mode, setMode }: { mode: string; setMode: (m: any) => void }) {
  const modes = [
    { key: "http", label: "HTTP", color: "text-[var(--accent)]" },
    { key: "websocket", label: "WebSocket", color: "text-purple-400" },
    { key: "graphql", label: "GraphQL", color: "text-pink-400" },
    { key: "sse", label: "SSE", color: "text-orange-400" },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-1.5">
      {modes.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => setMode(m.key)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            mode === m.key
              ? `bg-[var(--bg-tertiary)] ${m.color}`
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
