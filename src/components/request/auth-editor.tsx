"use client";

import { useState, useMemo } from "react";
import { useRequestStore } from "@/store/request-store";
import { useCollectionStore, Collection, Folder } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { ArrowUpRight } from "lucide-react";

type AuthType = "inherit" | "none" | "bearer" | "basic" | "api-key" | "oauth2" | "digest" | "aws-sig";

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
  const [oauth2GrantType, setOauth2GrantType] = useState<"authorization_code" | "client_credentials" | "password" | "pkce">("client_credentials");
  const [oauth2TokenUrl, setOauth2TokenUrl] = useState("");
  const [oauth2AuthUrl, setOauth2AuthUrl] = useState("");
  const [oauth2CallbackUrl, setOauth2CallbackUrl] = useState("http://localhost:3000/api/oauth/callback");
  const [oauth2ClientId, setOauth2ClientId] = useState("");
  const [oauth2ClientSecret, setOauth2ClientSecret] = useState("");
  const [oauth2Scope, setOauth2Scope] = useState("");
  const [oauth2Token, setOauth2Token] = useState("");
  const [oauth2RefreshToken, setOauth2RefreshToken] = useState("");
  const [oauth2TokenExpiry, setOauth2TokenExpiry] = useState<number | null>(null);
  const [oauth2Loading, setOauth2Loading] = useState(false);
  const [oauth2AutoRefresh, setOauth2AutoRefresh] = useState(true);

  // Digest Auth
  const [digestUsername, setDigestUsername] = useState("");
  const [digestPassword, setDigestPassword] = useState("");
  const [digestRealm, setDigestRealm] = useState("");

  // AWS Signature
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsService, setAwsService] = useState("execute-api");

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
      if (oauth2GrantType === "authorization_code" || oauth2GrantType === "pkce") {
        // Open authorization URL in popup
        const state = crypto.randomUUID();
        let authUrl = `${oauth2AuthUrl}?response_type=code&client_id=${encodeURIComponent(oauth2ClientId)}&redirect_uri=${encodeURIComponent(oauth2CallbackUrl)}&state=${state}`;
        if (oauth2Scope) authUrl += `&scope=${encodeURIComponent(oauth2Scope)}`;

        let codeVerifier = "";
        if (oauth2GrantType === "pkce") {
          // Generate PKCE code verifier and challenge
          codeVerifier = generateCodeVerifier();
          const codeChallenge = await generateCodeChallenge(codeVerifier);
          authUrl += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
        }

        // Open popup for auth
        const popup = window.open(authUrl, "oauth2", "width=600,height=700");
        if (!popup) {
          alert("Popup blocked. Please allow popups for this site.");
          setOauth2Loading(false);
          return;
        }

        // Listen for callback
        const code = await waitForAuthCode(popup, state);
        if (!code) {
          setOauth2Loading(false);
          return;
        }

        // Exchange code for token
        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", oauth2CallbackUrl);
        params.append("client_id", oauth2ClientId);
        if (oauth2GrantType !== "pkce") {
          params.append("client_secret", oauth2ClientSecret);
        } else {
          params.append("code_verifier", codeVerifier);
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
        handleTokenResponse(data);
      } else {
        // Client Credentials / Password flow
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
        handleTokenResponse(data);
      }
    } catch (err: any) {
      console.error("OAuth2 token fetch failed:", err);
    } finally {
      setOauth2Loading(false);
    }
  };

  const handleTokenResponse = (data: any) => {
    if (data.body) {
      const tokenData = typeof data.body === "string" ? JSON.parse(data.body) : data.body;
      if (tokenData.access_token) {
        setOauth2Token(tokenData.access_token);
        if (tokenData.refresh_token) {
          setOauth2RefreshToken(tokenData.refresh_token);
        }
        if (tokenData.expires_in) {
          setOauth2TokenExpiry(Date.now() + tokenData.expires_in * 1000);
        }
      }
    }
  };

  const refreshOAuth2Token = async () => {
    if (!oauth2RefreshToken || !oauth2TokenUrl) return;
    setOauth2Loading(true);
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", oauth2RefreshToken);
      params.append("client_id", oauth2ClientId);
      if (oauth2ClientSecret) params.append("client_secret", oauth2ClientSecret);

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
      handleTokenResponse(data);
    } catch (err: any) {
      console.error("Token refresh failed:", err);
    } finally {
      setOauth2Loading(false);
    }
  };

  const isTokenExpired = oauth2TokenExpiry ? Date.now() > oauth2TokenExpiry : false;

  const authTypes: { key: AuthType; label: string }[] = [
    { key: "inherit", label: "Inherit" },
    { key: "none", label: "None" },
    { key: "bearer", label: "Bearer Token" },
    { key: "basic", label: "Basic Auth" },
    { key: "api-key", label: "API Key" },
    { key: "oauth2", label: "OAuth 2.0" },
    { key: "digest", label: "Digest Auth" },
    { key: "aws-sig", label: "AWS Signature" },
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
              <option value="pkce">Authorization Code (PKCE)</option>
              <option value="password">Resource Owner Password</option>
            </select>
          </div>
          {(oauth2GrantType === "authorization_code" || oauth2GrantType === "pkce") && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Authorization URL</label>
                <input type="text" value={oauth2AuthUrl} onChange={(e) => setOauth2AuthUrl(e.target.value)} placeholder="https://auth.example.com/authorize"
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Callback URL</label>
                <input type="text" value={oauth2CallbackUrl} onChange={(e) => setOauth2CallbackUrl(e.target.value)} placeholder="http://localhost:3000/api/oauth/callback"
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
              </div>
            </>
          )}
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
            {oauth2GrantType !== "pkce" && (
              <div className="flex flex-1 flex-col gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Client Secret</label>
                <input type="password" value={oauth2ClientSecret} onChange={(e) => setOauth2ClientSecret(e.target.value)} placeholder="Client Secret"
                  className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
              </div>
            )}
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
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input type="checkbox" checked={oauth2AutoRefresh} onChange={(e) => setOauth2AutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh token when expired
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={fetchOAuth2Token} disabled={oauth2Loading}
              className="rounded bg-[var(--info)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50">
              {oauth2Loading ? "Fetching..." : "Get New Access Token"}
            </button>
            {oauth2RefreshToken && (
              <button type="button" onClick={refreshOAuth2Token} disabled={oauth2Loading}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:bg-[var(--border)]">
                Refresh Token
              </button>
            )}
          </div>
          {oauth2Token && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Access Token</label>
                {isTokenExpired && (
                  <span className="rounded bg-red-900/20 px-1.5 py-0.5 text-[9px] text-[var(--error)]">Expired</span>
                )}
                {!isTokenExpired && oauth2TokenExpiry && (
                  <span className="rounded bg-green-900/20 px-1.5 py-0.5 text-[9px] text-[var(--success)]">Active</span>
                )}
              </div>
              <input type="text" value={oauth2Token} onChange={(e) => setOauth2Token(e.target.value)}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-xs text-[var(--success)] outline-none" readOnly aria-label="Access token" />
            </div>
          )}
          {oauth2RefreshToken && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-secondary)]">Refresh Token</label>
              <input type="text" value={oauth2RefreshToken}
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)] outline-none" readOnly aria-label="Refresh token" />
            </div>
          )}
        </div>
      )}

      {/* Digest Auth */}
      {authType === "digest" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Username</label>
              <input type="text" value={digestUsername} onChange={(e) => setDigestUsername(e.target.value)} placeholder="Username"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Password</label>
              <input type="password" value={digestPassword} onChange={(e) => setDigestPassword(e.target.value)} placeholder="Password"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Realm (optional, auto-detected from 401 response)</label>
            <input type="text" value={digestRealm} onChange={(e) => setDigestRealm(e.target.value)} placeholder="Auto-detected"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            Digest auth will send an initial request to get the WWW-Authenticate challenge, then retry with proper credentials.
          </p>
        </div>
      )}

      {/* AWS Signature */}
      {authType === "aws-sig" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Access Key</label>
              <input type="text" value={awsAccessKey} onChange={(e) => setAwsAccessKey(e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Secret Key</label>
              <input type="password" value={awsSecretKey} onChange={(e) => setAwsSecretKey(e.target.value)} placeholder="Secret access key"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Region</label>
              <input type="text" value={awsRegion} onChange={(e) => setAwsRegion(e.target.value)} placeholder="us-east-1"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="text-xs text-[var(--text-secondary)]">Service</label>
              <input type="text" value={awsService} onChange={(e) => setAwsService(e.target.value)} placeholder="execute-api"
                className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)]">
            AWS Signature V4 will be computed and added to the request headers automatically.
          </p>
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

// ============================================
// PKCE Helpers
// ============================================

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = "";
  buffer.forEach((byte) => { str += String.fromCharCode(byte); });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function waitForAuthCode(popup: Window, expectedState: string): Promise<string | null> {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          resolve(null);
          return;
        }
        const url = popup.location.href;
        if (url && url.includes("code=")) {
          const params = new URL(url).searchParams;
          const code = params.get("code");
          const state = params.get("state");
          popup.close();
          clearInterval(interval);
          if (state === expectedState && code) {
            resolve(code);
          } else {
            resolve(null);
          }
        }
      } catch {
        // Cross-origin - popup hasn't redirected back yet
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(interval);
      if (!popup.closed) popup.close();
      resolve(null);
    }, 300000);
  });
}
