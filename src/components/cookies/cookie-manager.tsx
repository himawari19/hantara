"use client";

import { useState } from "react";
import { useCookieStore, Cookie } from "@/store/cookie-store";
import { X, Trash2, Plus, Search, Cookie as CookieIcon } from "lucide-react";

interface CookieManagerProps {
  onClose: () => void;
}

export function CookieManager({ onClose }: CookieManagerProps) {
  const { cookies, removeCookie, clearDomain, clearAll, addCookie } = useCookieStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Group cookies by domain
  const domains = [...new Set(cookies.map((c) => c.domain))];
  const filteredDomains = domains.filter(
    (d) => d.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <CookieIcon size={16} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Cookie Manager</h3>
            <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
              {cookies.length} cookies
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <Plus size={12} /> Add
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
            >
              <Trash2 size={12} /> Clear All
            </button>
            <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          <Search size={14} className="text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by domain..."
            className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
        </div>

        {/* Cookie List */}
        <div className="max-h-[500px] overflow-auto">
          {filteredDomains.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--text-secondary)]">
              {cookies.length === 0 ? "No cookies stored. Cookies from responses will appear here." : "No matching domains."}
            </p>
          ) : (
            filteredDomains.map((domain) => (
              <DomainGroup
                key={domain}
                domain={domain}
                cookies={cookies.filter((c) => c.domain === domain)}
                onRemoveCookie={removeCookie}
                onClearDomain={clearDomain}
              />
            ))
          )}
        </div>

        {/* Add Cookie Dialog */}
        {showAdd && <AddCookieDialog onAdd={addCookie} onClose={() => setShowAdd(false)} />}
      </div>
    </div>
  );
}

function DomainGroup({
  domain,
  cookies,
  onRemoveCookie,
  onClearDomain,
}: {
  domain: string;
  cookies: Cookie[];
  onRemoveCookie: (domain: string, name: string) => void;
  onClearDomain: (domain: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-tertiary)]">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
          {domain}
          <span className="text-[10px] text-[var(--text-secondary)]">({cookies.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onClearDomain(domain)}
          className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
          aria-label={`Clear all cookies for ${domain}`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {isOpen && (
        <div className="pb-1">
          {cookies.map((cookie) => (
            <div
              key={`${cookie.name}-${cookie.path}`}
              className="flex items-center gap-3 px-8 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
            >
              <span className="min-w-[100px] font-medium text-[var(--info)]">{cookie.name}</span>
              <span className="flex-1 truncate text-[var(--text-secondary)]">{cookie.value}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{cookie.path}</span>
              {cookie.secure && <span className="text-[10px] text-[var(--warning)]">🔒</span>}
              <button
                type="button"
                onClick={() => onRemoveCookie(domain, cookie.name)}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label={`Remove cookie ${cookie.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCookieDialog({ onAdd, onClose }: { onAdd: (cookie: Cookie) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [domain, setDomain] = useState("");
  const [path, setPath] = useState("/");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domain.trim()) return;
    onAdd({ name: name.trim(), value, domain: domain.trim(), path: path || "/" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <form
        className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h4 className="mb-3 text-sm font-bold text-[var(--text-primary)]">Add Cookie</h4>
        <div className="flex flex-col gap-2">
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Domain (e.g. example.com)" className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" required />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cookie name" className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" required />
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Cookie value" className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
          <input type="text" value={path} onChange={(e) => setPath(e.target.value)} placeholder="Path (default: /)" className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none" />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
          <button type="submit" className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white">Add</button>
        </div>
      </form>
    </div>
  );
}
