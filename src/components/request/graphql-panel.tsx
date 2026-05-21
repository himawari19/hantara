"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";
import { useEnvironmentStore } from "@/store/environment-store";
import dynamic from "next/dynamic";
import { Play, BookOpen, RefreshCw } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-secondary)]">Loading editor...</div>,
});

interface GraphQLSchema {
  types: { name: string; fields: { name: string; type: string }[] }[];
  queries: string[];
  mutations: string[];
}

export function GraphQLPanel() {
  const { url, setUrl, setResponse, setLoading, setError } = useRequestStore();
  const { interpolate } = useEnvironmentStore();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [variables, setVariables] = useState("{}");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([
    { key: "Content-Type", value: "application/json" },
  ]);
  const [schema, setSchema] = useState<GraphQLSchema | null>(null);
  const [activeTab, setActiveTab] = useState<"query" | "variables" | "headers" | "schema">("query");
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  const sendQuery = async () => {
    if (!url.trim()) {
      setError("GraphQL endpoint URL is required");
      return;
    }

    setLoading(true);
    setError(null);

    const resolvedUrl = interpolate(url);
    const startTime = performance.now();

    try {
      let parsedVars = {};
      try {
        parsedVars = JSON.parse(variables);
      } catch {
        // ignore invalid variables
      }

      const reqHeaders: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) reqHeaders[h.key] = h.value;
      });

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "POST",
          url: resolvedUrl,
          headers: reqHeaders,
          body: JSON.stringify({ query, variables: parsedVars }),
        }),
      });

      const data = await res.json();
      const time = Math.round(performance.now() - startTime);

      setResponse({
        status: data.status,
        statusText: data.statusText,
        headers: data.headers || {},
        body: typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2),
        time,
        size: new Blob([JSON.stringify(data.body)]).size,
        cookies: [],
      });
    } catch (err: any) {
      setError(err.message || "GraphQL request failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async () => {
    if (!url.trim()) return;

    setIsLoadingSchema(true);
    try {
      const resolvedUrl = interpolate(url);
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "POST",
          url: resolvedUrl,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: INTROSPECTION_QUERY }),
        }),
      });

      const data = await res.json();
      const body = typeof data.body === "string" ? JSON.parse(data.body) : data.body;

      if (body?.data?.__schema) {
        const types = body.data.__schema.types
          .filter((t: any) => !t.name.startsWith("__") && t.fields)
          .map((t: any) => ({
            name: t.name,
            fields: (t.fields || []).map((f: any) => ({
              name: f.name,
              type: formatGraphQLType(f.type),
            })),
          }));

        const queryType = body.data.__schema.queryType?.name;
        const mutationType = body.data.__schema.mutationType?.name;

        const queries = types.find((t: any) => t.name === queryType)?.fields.map((f: any) => f.name) || [];
        const mutations = types.find((t: any) => t.name === mutationType)?.fields.map((f: any) => f.name) || [];

        setSchema({ types, queries, mutations });
        setActiveTab("schema");
      }
    } catch (err: any) {
      console.error("Schema fetch failed:", err);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* URL Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <span className="rounded bg-purple-900/30 px-2 py-1.5 text-xs font-bold text-purple-400">
          GQL
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/graphql"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button
          type="button"
          onClick={fetchSchema}
          disabled={isLoadingSchema}
          className="flex items-center gap-1 rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          title="Fetch schema (introspection)"
        >
          <RefreshCw size={12} className={isLoadingSchema ? "animate-spin" : ""} />
          Schema
        </button>
        <button
          type="button"
          onClick={sendQuery}
          className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"
        >
          <Play size={14} /> Query
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {(["query", "variables", "headers", "schema"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize ${
              activeTab === tab
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "query" && (
          <MonacoEditor
            height="100%"
            language="graphql"
            value={query}
            onChange={(v) => setQuery(v || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        )}

        {activeTab === "variables" && (
          <MonacoEditor
            height="100%"
            language="json"
            value={variables}
            onChange={(v) => setVariables(v || "{}")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        )}

        {activeTab === "headers" && (
          <div className="flex flex-col gap-2 p-3">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={h.key}
                  onChange={(e) => {
                    const newH = [...headers];
                    newH[i] = { ...newH[i], key: e.target.value };
                    setHeaders(newH);
                  }}
                  placeholder="Header name"
                  className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                />
                <input
                  type="text"
                  value={h.value}
                  onChange={(e) => {
                    const newH = [...headers];
                    newH[i] = { ...newH[i], value: e.target.value };
                    setHeaders(newH);
                  }}
                  placeholder="Value"
                  className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setHeaders([...headers, { key: "", value: "" }])}
              className="self-start text-xs text-[var(--accent)]"
            >
              + Add Header
            </button>
          </div>
        )}

        {activeTab === "schema" && (
          <div className="p-3">
            {!schema ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <BookOpen size={32} className="text-[var(--text-secondary)] opacity-50" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Click &quot;Schema&quot; button to fetch the GraphQL schema via introspection
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {schema.queries.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-bold text-[var(--success)]">Queries</h4>
                    <div className="flex flex-wrap gap-1">
                      {schema.queries.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuery(`query {\n  ${q} {\n    \n  }\n}`)}
                          className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] hover:ring-1 hover:ring-[var(--accent)]"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {schema.mutations.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-bold text-[var(--warning)]">Mutations</h4>
                    <div className="flex flex-wrap gap-1">
                      {schema.mutations.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setQuery(`mutation {\n  ${m}(\n    \n  ) {\n    \n  }\n}`)}
                          className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] hover:ring-1 hover:ring-[var(--accent)]"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {schema.types.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-bold text-[var(--info)]">Types ({schema.types.length})</h4>
                    <div className="flex flex-col gap-2">
                      {schema.types.slice(0, 20).map((t) => (
                        <details key={t.name} className="rounded border border-[var(--border)]">
                          <summary className="cursor-pointer px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                            {t.name}
                          </summary>
                          <div className="border-t border-[var(--border)] px-3 py-2">
                            {t.fields.map((f) => (
                              <div key={f.name} className="flex gap-2 py-0.5 text-xs">
                                <span className="text-[var(--text-primary)]">{f.name}</span>
                                <span className="text-[var(--text-secondary)]">: {f.type}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatGraphQLType(type: any): string {
  if (!type) return "Unknown";
  if (type.kind === "NON_NULL") return `${formatGraphQLType(type.ofType)}!`;
  if (type.kind === "LIST") return `[${formatGraphQLType(type.ofType)}]`;
  return type.name || "Unknown";
}

const DEFAULT_QUERY = `# Write your GraphQL query here
query {
  
}
`;

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  }
`;
