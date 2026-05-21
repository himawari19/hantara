"use client";

import { useRequestStore } from "@/store/request-store";
import { HistoryPanel } from "../history/history-panel";
import { ResponseDiff } from "./response-diff";
import { useState } from "react";
import { Copy, Check, Download, Search, ArrowLeftRight } from "lucide-react";
import dynamic from "next/dynamic";
import { ResponseVisualizer } from "./response-visualizer";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default).catch(() => {
    // Fallback if Monaco fails to load
    return function FallbackEditor(props: any) {
      return (
        <pre className="h-full overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-xs text-[var(--text-primary)]">
          {props.value}
        </pre>
      );
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
        Loading editor...
      </div>
    ),
  }
);

type ResponseTab = "body" | "headers" | "cookies" | "test-results" | "visualize" | "history";
type BodyView = "pretty" | "raw" | "preview";

export function ResponsePanel() {
  const { response, isLoading, error, testResults } = useRequestStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");
  const [bodyView, setBodyView] = useState<BodyView>("pretty");
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--text-secondary)]">
          <svg
            className="h-8 w-8 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Sending request...</span>
        </div>
      </div>
    );
  }

  if (error && activeTab !== "history") {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={null} testResults={testResults} />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="rounded-lg border border-red-900/30 bg-red-900/10 px-6 py-4 text-center">
            <p className="text-sm font-medium text-[var(--error)]">{error}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Check the URL and try again</p>
          </div>
        </div>
      </div>
    );
  }

  if (!response && activeTab !== "history") {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={null} testResults={testResults} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[var(--text-secondary)] opacity-50">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            Send a request to see the response
          </p>
          <p className="text-xs text-[var(--text-secondary)] opacity-60">
            Ctrl+Enter to send
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === "history") {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={response} testResults={testResults} />
        <div className="flex-1 overflow-auto">
          <HistoryPanel />
        </div>
      </div>
    );
  }

  if (!response) return null;

  const statusColor =
    response.status >= 200 && response.status < 300
      ? "text-[var(--success)]"
      : response.status >= 400
      ? "text-[var(--error)]"
      : "text-[var(--warning)]";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([response.body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBodyLanguage = () => {
    const contentType = Object.entries(response.headers).find(
      ([k]) => k.toLowerCase() === "content-type"
    )?.[1] || "";
    if (contentType.includes("json")) return "json";
    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    // Try to detect JSON
    try {
      JSON.parse(response.body);
      return "json";
    } catch {
      return "plaintext";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Status Bar */}
      <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-2">
        <span className={`text-sm font-bold ${statusColor}`}>
          {response.status} {response.statusText}
        </span>
        <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
          {response.time}ms
        </span>
        <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
          {formatBytes(response.size)}
        </span>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Search in response"
            aria-label="Search in response"
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Copy response"
            aria-label="Copy response body"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Download response"
            aria-label="Download response"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={() => setShowDiff(true)}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Compare responses"
            aria-label="Compare responses"
          >
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={response} testResults={testResults} />

      {/* Search bar */}
      {showSearch && activeTab === "body" && (
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
          <Search size={14} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in response body..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "body" && (
          <div className="flex h-full flex-col">
            {/* View Toggle */}
            <div className="flex items-center gap-1 border-b border-[var(--border)] px-3 py-1.5">
              {(["pretty", "raw", "preview"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setBodyView(view)}
                  className={`rounded px-2 py-0.5 text-xs capitalize ${
                    bodyView === view
                      ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-auto">
              {bodyView === "pretty" && (
                <MonacoEditor
                  height="100%"
                  language={getBodyLanguage()}
                  value={response.body}
                  theme="light"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 8 },
                  }}
                />
              )}
              {bodyView === "raw" && (
                <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs text-[var(--text-primary)]">
                  {response.body}
                </pre>
              )}
              {bodyView === "preview" && (
                <iframe
                  srcDoc={response.body}
                  className="h-full w-full bg-white"
                  sandbox="allow-same-origin"
                  title="Response preview"
                />
              )}
            </div>
          </div>
        )}

        {activeTab === "headers" && (
          <div className="flex flex-col gap-0.5 p-3">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--bg-tertiary)]">
                <span className="min-w-[180px] font-medium text-[var(--info)]">{key}</span>
                <span className="break-all text-[var(--text-secondary)]">{value}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === "cookies" && (
          <div className="p-3">
            {response.cookies.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-secondary)]">No cookies in response</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Domain</th>
                    <th className="px-2 py-2">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {response.cookies.map((cookie, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="px-2 py-2 font-medium text-[var(--text-primary)]">{cookie.name}</td>
                      <td className="max-w-[200px] truncate px-2 py-2 text-[var(--text-secondary)]">{cookie.value}</td>
                      <td className="px-2 py-2 text-[var(--text-secondary)]">{cookie.domain || "—"}</td>
                      <td className="px-2 py-2 text-[var(--text-secondary)]">{cookie.path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "test-results" && (
          <div className="p-3">
            {testResults.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-secondary)]">
                No test results. Add tests in the Tests tab and send a request.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="mb-2 text-xs text-[var(--text-secondary)]">
                  {testResults.filter((t) => t.passed).length}/{testResults.length} tests passed
                </div>
                {testResults.map((result, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${
                      result.passed ? "bg-green-900/10" : "bg-red-900/10"
                    }`}
                  >
                    <span className={`text-lg ${result.passed ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                      {result.passed ? "✓" : "✗"}
                    </span>
                    <span className="text-[var(--text-primary)]">{result.name}</span>
                    {result.error && (
                      <span className="ml-auto text-xs text-[var(--error)]">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "visualize" && <ResponseVisualizer />}
      </div>

      {/* Diff Modal */}
      {showDiff && response && (
        <ResponseDiff currentResponse={response} onClose={() => setShowDiff(false)} />
      )}
    </div>
  );
}

function ResponseTabs({
  activeTab,
  setActiveTab,
  response,
  testResults,
}: {
  activeTab: ResponseTab;
  setActiveTab: (tab: ResponseTab) => void;
  response: any;
  testResults: any[];
}) {
  return (
    <div className="flex border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setActiveTab("body")}
        className={`px-4 py-2 text-sm ${
          activeTab === "body"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Body
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("headers")}
        className={`px-4 py-2 text-sm ${
          activeTab === "headers"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Headers {response ? `(${Object.keys(response.headers).length})` : ""}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("cookies")}
        className={`px-4 py-2 text-sm ${
          activeTab === "cookies"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Cookies {response?.cookies?.length ? `(${response.cookies.length})` : ""}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("test-results")}
        className={`px-4 py-2 text-sm ${
          activeTab === "test-results"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Tests {testResults.length > 0 ? `(${testResults.filter((t) => t.passed).length}/${testResults.length})` : ""}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("visualize")}
        className={`px-4 py-2 text-sm ${
          activeTab === "visualize"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Visualize
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className={`px-4 py-2 text-sm ${
          activeTab === "history"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        History
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
