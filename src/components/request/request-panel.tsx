"use client";

import { useRequestStore } from "@/store/request-store";
import { HeadersEditor } from "./headers-editor";
import { BodyEditor } from "./body-editor";
import { ParamsEditor } from "./params-editor";
import { AuthEditor } from "./auth-editor";
import { OverviewTab } from "./overview-tab";
import { ScriptsTab } from "./scripts-tab";
import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type TopTab = "overview" | "authorization" | "scripts";
type RequestTab = "params" | "headers" | "body" | "auth";

export function RequestPanel() {
  const { method, url, setMethod, setUrl, sendRequest, isLoading } =
    useRequestStore();
  const [topTab, setTopTab] = useState<TopTab>("overview");
  const [activeTab, setActiveTab] = useState<RequestTab>("params");

  const methodColors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-gray-400",
    OPTIONS: "text-cyan-400",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top-level Tabs: Overview / Authorization / Scripts */}
      <div className="flex border-b border-[var(--border)]">
        {(["overview", "authorization", "scripts"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTopTab(tab)}
            className={`px-4 py-2.5 text-sm capitalize ${
              topTab === tab
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Top Tab Content */}
      {topTab === "overview" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* URL Bar */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
            {/* Method Selector */}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className={`rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm font-bold outline-none ${methodColors[method] || "text-[var(--text-primary)]"}`}
              aria-label="HTTP method"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* URL Input */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter request URL (e.g. https://api.example.com/users)"
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendRequest();
              }}
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={sendRequest}
              disabled={isLoading}
              className="rounded bg-[var(--accent)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>

          {/* Request Sub-Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {(["params", "headers", "body", "auth"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm capitalize ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-3">
            {activeTab === "params" && <ParamsEditor />}
            {activeTab === "headers" && <HeadersEditor />}
            {activeTab === "body" && <BodyEditor />}
            {activeTab === "auth" && <AuthEditor />}
          </div>
        </div>
      )}

      {topTab === "authorization" && (
        <div className="flex-1 overflow-auto p-3">
          <AuthEditor />
        </div>
      )}

      {topTab === "scripts" && (
        <div className="flex-1 overflow-auto">
          <ScriptsTab />
        </div>
      )}
    </div>
  );
}
