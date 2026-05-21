"use client";

import { useState } from "react";
import { CollectionTree } from "../collections/collection-tree";
import { UserMenu } from "../auth/user-menu";
import { useEnvironmentStore } from "@/store/environment-store";

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<"collections" | "environments">("collections");

  return (
    <aside
      className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200 ${
        isCollapsed ? "w-12" : "w-72"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[var(--accent)]">Hantara</h1>
            <span className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
              Workspace
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isCollapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
      </div>

      {/* Section Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => setActiveSection("collections")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs ${
              activeSection === "collections"
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            Collections
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("environments")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs ${
              activeSection === "environments"
                ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            Environments
          </button>
        </div>
      )}

      {/* Collapsed icons */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-2 py-3">
          <button
            type="button"
            onClick={() => { setIsCollapsed(false); setActiveSection("collections"); }}
            className={`rounded p-2 ${activeSection === "collections" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            aria-label="Collections"
            title="Collections"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => { setIsCollapsed(false); setActiveSection("environments"); }}
            className={`rounded p-2 ${activeSection === "environments" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            aria-label="Environments"
            title="Environments"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-auto p-2">
          {activeSection === "collections" && <CollectionTree />}
          {activeSection === "environments" && <EnvironmentList />}
        </div>
      )}

      {/* Search */}
      {!isCollapsed && (
        <div className="border-t border-[var(--border)] px-2 py-2">
          <div className="flex items-center gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search collections"
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}

      {/* User Menu at bottom */}
      {!isCollapsed && (
        <div className="border-t border-[var(--border)] px-2 py-2">
          <UserMenu />
        </div>
      )}
    </aside>
  );
}

function EnvironmentList() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
    removeEnvironment,
  } = useEnvironmentStore();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => addEnvironment("New Environment")}
        className="mb-2 flex items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Environment
      </button>

      {environments.map((env: any) => (
        <div
          key={env.id}
          className={`flex items-center justify-between rounded px-2 py-1.5 text-sm cursor-pointer ${
            activeEnvironmentId === env.id
              ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          }`}
          onClick={() => setActiveEnvironment(env.id)}
        >
          <span className="truncate text-xs">{env.name}</span>
          {activeEnvironmentId === env.id && (
            <span className="text-[10px] text-[var(--accent)]">Active</span>
          )}
        </div>
      ))}

      {environments.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-[var(--text-secondary)]">
          No environments yet.
        </p>
      )}
    </div>
  );
}
