"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";

type AuthType = "none" | "bearer" | "basic" | "api-key";

export function AuthEditor() {
  const { headers, setHeaders } = useRequestStore();
  const [authType, setAuthType] = useState<AuthType>("none");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");

  const applyAuth = () => {
    // Remove existing auth headers
    const filtered = headers.filter(
      (h) =>
        h.key.toLowerCase() !== "authorization" &&
        h.key.toLowerCase() !== apiKeyName.toLowerCase()
    );

    switch (authType) {
      case "bearer":
        if (token.trim()) {
          filtered.unshift({ key: "Authorization", value: `Bearer ${token}`, enabled: true });
        }
        break;
      case "basic":
        if (username.trim()) {
          const encoded = btoa(`${username}:${password}`);
          filtered.unshift({ key: "Authorization", value: `Basic ${encoded}`, enabled: true });
        }
        break;
      case "api-key":
        if (apiKey.trim()) {
          filtered.unshift({ key: apiKeyName, value: apiKey, enabled: true });
        }
        break;
    }

    setHeaders(filtered);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Auth Type Selector */}
      <div className="flex items-center gap-3">
        {(["none", "bearer", "basic", "api-key"] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="authType"
              value={type}
              checked={authType === type}
              onChange={() => setAuthType(type)}
              className="accent-[var(--accent)]"
            />
            <span className="text-[var(--text-secondary)]">
              {type === "none" ? "None" : type === "bearer" ? "Bearer Token" : type === "basic" ? "Basic Auth" : "API Key"}
            </span>
          </label>
        ))}
      </div>

      {/* Auth Fields */}
      {authType === "bearer" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Token</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter bearer token"
            className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>
      )}

      {authType === "basic" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}

      {authType === "api-key" && (
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Header Name</label>
            <input
              type="text"
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              placeholder="X-API-Key"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Value</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API key value"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}

      {authType !== "none" && (
        <button
          type="button"
          onClick={applyAuth}
          className="self-start rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Apply to Headers
        </button>
      )}
    </div>
  );
}
