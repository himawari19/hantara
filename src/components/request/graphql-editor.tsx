"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";

export function GraphQLEditor() {
  const { url, setUrl, body, setBody, sendRequest, isLoading } = useRequestStore();
  const [variables, setVariables] = useState("{}");
  const [activeTab, setActiveTab] = useState<"query" | "variables">("query");

  // Parse the body to extract query and variables
  const getQuery = () => {
    try {
      const parsed = JSON.parse(body);
      return parsed.query || "";
    } catch {
      return body;
    }
  };

  const getVariables = () => {
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed.variables || {}, null, 2);
    } catch {
      return variables;
    }
  };

  const updateBody = (query: string, vars: string) => {
    try {
      const parsedVars = JSON.parse(vars || "{}");
      setBody(JSON.stringify({ query, variables: parsedVars }, null, 2));
    } catch {
      setBody(JSON.stringify({ query, variables: {} }, null, 2));
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* URL Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <span className="rounded bg-pink-600/20 px-2 py-1 text-xs font-bold text-pink-400">
          GQL
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/graphql"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") sendRequest();
          }}
        />
        <button
          type="button"
          onClick={sendRequest}
          disabled={isLoading}
          className="rounded bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Execute"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("query")}
          className={`px-4 py-2 text-xs ${
            activeTab === "query"
              ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Query
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("variables")}
          className={`px-4 py-2 text-xs ${
            activeTab === "variables"
              ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Variables
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 p-3">
        {activeTab === "query" ? (
          <textarea
            value={getQuery()}
            onChange={(e) => updateBody(e.target.value, getVariables())}
            placeholder={`query {\n  users {\n    id\n    name\n    email\n  }\n}`}
            className="h-full w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            spellCheck={false}
          />
        ) : (
          <textarea
            value={getVariables()}
            onChange={(e) => {
              setVariables(e.target.value);
              updateBody(getQuery(), e.target.value);
            }}
            placeholder={'{\n  "id": "123"\n}'}
            className="h-full w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
