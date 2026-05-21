"use client";

import { useRequestStore } from "@/store/request-store";
import { HistoryPanel } from "../history/history-panel";
import { useState } from "react";

type ResponseTab = "body" | "headers" | "history";

export function ResponsePanel() {
  const { response, isLoading, error } = useRequestStore();
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--text-secondary)]">
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Sending request...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={null} />
        <div className="flex flex-1 items-center justify-center p-4">
          {activeTab === "history" ? (
            <HistoryPanel />
          ) : (
            <div className="rounded bg-red-900/20 px-4 py-3 text-sm text-[var(--error)]">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!response && activeTab !== "history") {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={null} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Send a request to see the response here.
          </p>
        </div>
      </div>
    );
  }

  if (activeTab === "history") {
    return (
      <div className="flex h-full flex-col">
        <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={response} />
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

  return (
    <div className="flex h-full flex-col">
      {/* Status Bar */}
      <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-2">
        <span className={`text-sm font-bold ${statusColor}`}>
          {response.status} {response.statusText}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {response.time}ms
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {formatBytes(response.size)}
        </span>
      </div>

      {/* Tabs */}
      <ResponseTabs activeTab={activeTab} setActiveTab={setActiveTab} response={response} />

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "body" && (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-[var(--text-primary)]">
            {response.body}
          </pre>
        )}
        {activeTab === "headers" && (
          <div className="flex flex-col gap-1">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm">
                <span className="font-medium text-[var(--info)]">{key}:</span>
                <span className="text-[var(--text-secondary)]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResponseTabs({
  activeTab,
  setActiveTab,
  response,
}: {
  activeTab: ResponseTab;
  setActiveTab: (tab: ResponseTab) => void;
  response: any;
}) {
  return (
    <div className="flex border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setActiveTab("body")}
        className={`px-4 py-2 text-sm ${
          activeTab === "body"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
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
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }`}
      >
        Headers {response ? `(${Object.keys(response.headers).length})` : ""}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("history")}
        className={`px-4 py-2 text-sm ${
          activeTab === "history"
            ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
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
