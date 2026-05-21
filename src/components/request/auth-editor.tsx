"use client";

import { useState, useMemo } from "react";
import { useRequestStore } from "@/store/request-store";
import { useCollectionStore, Collection, Folder } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { ArrowUpRight } from "lucide-react";

type AuthType = "inherit" | "none" | "bearer" | "basic" | "api-key" | "oauth2";

// Helper to find parent auth by traversing the collection tree
function findParentAuth(
  collections: Collection[],
  requestId: string
): { type: string; config: Record<string, string>; source: string } | null {
  for (const col of collections) {
    // Check root requests
    if (col.requests.some((r) => r.id === requestId)) {
      if (col.auth && col.auth.type !== "none") {
        return { type: col.auth.type, config: col.auth.config, source: col.name };
      }
      return null;
    }
    // Check folders recursively
    const result = findAuthInFolders(col.folders, requestId, col);
    if (result !== undefined) return result;
  }
  return null;
}

function findAuthInFolders(
  folders: Folder[],
  requestId: string,
  collection: Collection,
  parentChain: Folder[] = []
): { type: string; config: Record<string, string>; source: string } | null | undefined {
  for (const folder of folders) {
    if (folder.requests.some((r) => r.id === requestId)) {
      // Found the request - walk up the chain
      if (folder.auth && folder.auth.type !== "none") {
        return { type: folder.auth.type, config: folder.auth.config, source: folder.name };
      }
      // Check parent folders
      for (let i = parentChain.length - 1; i >= 0; i--) {
        const parent = parentChain[i];
        if (parent.auth && parent.auth.type !== "none") {
          return { type: parent.auth.type, config: parent.auth.config, source: parent.name };
        }
      }
      // Check collection
      if (collection.auth && collection.auth.type !== "none") {
        return { type: collection.auth.type, config: collection.auth.config, source: collection.name };
      }
      return null;
    }
    // Recurse into subfolders
    const result = findAuthInFolders(folder.folders, requestId, collection, [...parentChain, folder]);
    if (result !== undefined) return result;
  }
  return undefined;
}

export function AuthEditor() {
  const { headers, setHeaders } = useRequestStore();
  const { collections } = useCollectionStore();
  const { activeTabId, tabs } = useTabStore();
  const [authType, setAuthType] = useState<AuthType>("inherit");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">("header");

  // OAuth 2.0
  const [oauth2GrantType, setOauth2GrantType] = useState<"authorization_code" | "client_credentials" | "password">("client_credentials");
  const [oauth2TokenUrl, setOauth2TokenUrl] = useState("");
  const [oauth2ClientId, setOauth2ClientId] = useState("");
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState("");
  const [oauth2Scope, setOauth2Scope] = useState("");
  const [oauth2Token, setOauth2Token] = useState("");
  const [oauth2Loading, setOauth2Loading] = useState(false);

  // Find inherited auth
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const inheritedAuth = useMemo(() => {
    if (!activeTab?.requestId) return null;
    return findParentAuth(collections, activeTab.requestId);
  }, [collections, activeTab?.requestId]);

  const applyAuth = () => {
    const filtered = headers.filter(
      (h) =>
        h.key.toLowerCase() !== "authorization" &&
        h.key.toLowerCase() !== apiKeyName.toLowerCase()
    );

    let effectiveType = authType;
    let effectiveConfig: Record<string, string> = {};

    // If inheriting, use parent auth
    if (authType === "inherit" && inheritedAuth) {
      effectiveType = inheritedAuth.type as AuthType;
      effectiveConfig = inheritedAuth.config;
    }

    switch (effectiveType) {
      case "bearer": {
        const t = effectiveConfig.token || token;
        if (t.trim()) {
          filtered.unshift({ key: "Authorization", value: `Bearer ${t}`, enabled: true });
        }
        break;
      }
      case "basic": {
        const u = effectiveConfig.username || username;
        const p = effectiveConfig.password || password;
        if (u.trim()) {
          const encoded = btoa(`${u}:${p}`);
          filtered.unshift({ key: "Authorization", value: `Basic ${encoded}`, enabled: true });
        }
        break;
      }
      case "api-key": {
        const k = effectiveConfig.apiKey || apiKey;
        const kName = effectiveConfig.apiKeyName || apiKeyName;
        if (k.trim()) {
          filtered.unshift({ key: kName, value: k, enabled: true });
        }
        break;
      }
      case "oauth2": {
        const t = effectiveConfig.token || oauth2Token;
        if (t.trim()) {
          filtered.unshift({ key: "Authorization", value: `Bearer ${t}`, enabled: true });
        }
        break;
      }
    }

    setHeaders(filtered);
  };

  const fetchOAuth2Token = async () => {
    if (!oauth2TokenUrl.trim()) return;
    setOauth2Loading(true);
    try {
      const params = new URLSearchParams();
      params.append("grant_type", oauth2GrantType);
      params.append("client_id", oauth2ClientId);
      params.append("client_secret", oauth2ClientSecret);
      if (oauth2Scope) params.append("scope", oauth2Scope);
      if (oauth2GrantType === "password") {
        params.append("username", username);
        params.append("password", password);
      }
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "POST",
          url: oauth2TokenUrl,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }),
      });
      const data = await res.json();
      if (data.body) {
        const tokenData = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
        if (tokenData.access_token) {
          setOauth2Token(tokenData.access_token);
        }
      }
    } catch (err: any) {
      console.error("OAuth2 token fetch failed:", err);
    } finally {
      setOauth2Loading(false);
    }
  };

  const authTypes: { key: AuthType; label: string }[] = [
    { key: "inherit", label: "Inherit" },
    { key: "none", label: "None" },
    { key: "bearer", label: "Bearer Token" },
    { key: "basic", label: "Basic Auth" },
    { key: "api-key", label: "API Key" },
    { key: "oauth2", label: "OAuth 2.0" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Auth Type Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {authTypes.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => setAuthType(type.key)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              authType === type.key
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Inherit Info */}
      {authType === "inherit" && (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={14} className="text-[var(--accent)]" />
            {inheritedAuth ? (
              <div className="text-xs">
                <span className="text-[var(--text-secondary)]">Inheriting </span>
                <span className="font-medium text-[var(--text-primary)]">{inheritedAuth.type}</span>
                <span className="text-[var(--text-secondary)]"> auth from </span>
                <span className="font-medium text-[var(--accent)]">{inheritedAuth.source}</span>
              </div>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">
                No auth configured on parent folder or collection. Request will be sent without authentication.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bearer Token */}
      {authType === "bearer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Token</label>
          <input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter bearer token"
            className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
        </div>
      )}

      {/* Basic Auth */}
      {authType === "basic" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          </div>
        </div>
      )}

      {/* API Key */}
      {authType === "api-key" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Key</label>
              <input type="text" value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} placeholder="X-API-Key"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Value</label>
              <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key value"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Add to:</label>
            <select value={apiKeyLocation} onChange={(e) => setApiKeyLocation(e.target.value as "header" | "query")}
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none" aria-label="Add API key to">
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </div>
        </div>
      )}

      {/* OAuth 2.0 */}
      {authType === "oauth2" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Grant Type</label>
            <select value={oauth2GrantType} onChange={(e) => setOauth2GrantType(e.target.value as any)}
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none" aria-label="OAuth 2.0 grant type">
              <option value="client_credentials">Client Credentials</option>
              <option value="authorization_code">Authorization Code</option>
              <option value="password">Resource Owner Password</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Token URL</label>
            <input type="text" value={oauth2TokenUrl} onChange={(e) => setOauth2TokenUrl(e.target.value)} placeholder="https://auth.example.com/oauth/token"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Client ID</label>
              <input type="text" value={oauth2ClientId} onChange={(e) => setOauth2ClientId(e.target.value)} placeholder="Client ID"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Client Secret</label>
              <input type="password" value={oauth2ClientSecret} onChange={(e) => setOauth2ClientSecret(e.target.value)} placeholder="Client Secret"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Scope (optional)</label>
            <input type="text" value={oauth2Scope} onChange={(e) => setOauth2Scope(e.target.value)} placeholder="read write"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          </div>
          {oauth2GrantType === "password" && (
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
              </div>
            </div>
          )}
          <button type="button" onClick={fetchOAuth2Token} disabled={oauth2Loading}
            className="self-start rounded bg-[var(--info)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50">
            {oauth2Loading ? "Fetching..." : "Get New Access Token"}
          </button>
          {oauth2Token && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-secondary)]">Access Token</label>
              <input type="text" value={oauth2Token} onChange={(e) => setOauth2Token(e.target.value)}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-xs text-[var(--success)] outline-none" readOnly aria-label="Access token" />
            </div>
          )}
        </div>
      )}

      {/* Apply Button */}
      {authType !== "none" && (
        <button type="button" onClick={applyAuth}
          className="self-start rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]">
          Apply to Headers
        </button>
      )}
    </div>
  );
}
