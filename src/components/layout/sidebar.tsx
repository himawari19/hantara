"use client";

import { useState } from "react";
import { CollectionTree } from "../collections/collection-tree";
import { ImportDialog } from "../collections/import-dialog";
import { useThemeStore } from "@/store/theme-store";
import { Sun, Moon, Upload, Search, Server, Zap, Send, Activity, Cookie, FileText } from "lucide-react";

type MainView = "request" | "mock-server" | "load-test" | "monitor";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mainView: MainView;
  onViewChange: (view: MainView) => void;
  onShowCookies?: () => void;
  onShowDocs?: () => void;
}

export function Sidebar({ collapsed, onToggle, mainView, onViewChange, onShowCookies, onShowDocs }: SidebarProps) {
  const [showImport, setShowImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, toggleTheme } = useThemeStore();

  return (
    <aside
      className={`flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-all duration-200 ${
        collapsed ? "w-12" : "w-72"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3">
        {!collapsed && (
          <h1 className="text-lg font-bold text-[var(--accent)]">Hantara</h1>
        )}
        <div className="flex items-center gap-1">
          {!collapsed && (
            <>
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Import collection"
                title="Import collection"
              >
                <Upload size={16} />
              </button>
              <button
                type="button"
                onClick={onShowCookies}
                className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Cookie manager"
                title="Cookie Manager (Ctrl+Shift+K)"
              >
                <Cookie size={16} />
              </button>
              <button
                type="button"
                onClick={onShowDocs}
                className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Generate API docs"
                title="Generate API Documentation"
              >
                <FileText size={16} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      {!collapsed && (
        <div className="flex border-b border-[var(--border)]">
          <NavButton icon={Send} label="API" active={mainView === "request"} onClick={() => onViewChange("request")} />
          <NavButton icon={Server} label="Mock" active={mainView === "mock-server"} onClick={() => onViewChange("mock-server")} />
          <NavButton icon={Zap} label="Load" active={mainView === "load-test"} onClick={() => onViewChange("load-test")} />
          <NavButton icon={Activity} label="Monitor" active={mainView === "monitor"} onClick={() => onViewChange("monitor")} />
        </div>
      )}

      {/* Collapsed nav icons */}
      {collapsed && (
        <div className="flex flex-col items-center gap-1 border-b border-[var(--border)] py-2">
          <button
            type="button"
            onClick={() => onViewChange("request")}
            className={`rounded p-2 ${mainView === "request" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            title="API Client"
            aria-label="API Client"
          >
            <Send size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("mock-server")}
            className={`rounded p-2 ${mainView === "mock-server" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            title="Mock Server"
            aria-label="Mock Server"
          >
            <Server size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("load-test")}
            className={`rounded p-2 ${mainView === "load-test" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            title="Load Testing"
            aria-label="Load Testing"
          >
            <Zap size={16} />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("monitor")}
            className={`rounded p-2 ${mainView === "monitor" ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
            title="API Monitoring"
            aria-label="API Monitoring"
          >
            <Activity size={16} />
          </button>
        </div>
      )}

      {/* Search Bar (only in request view) */}
      {!collapsed && mainView === "request" && (
        <div className="border-b border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1.5">
            <Search size={14} className="text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections... (Ctrl+K)"
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
      )}

      {/* Collection Tree (only in request view) */}
      {!collapsed && mainView === "request" && (
        <div className="flex-1 overflow-auto p-2">
          <CollectionTree searchQuery={searchQuery} />
        </div>
      )}

      {/* Mock/Load info when not collapsed */}
      {!collapsed && mainView !== "request" && (
        <div className="flex-1 overflow-auto p-3">
          <p className="text-xs text-[var(--text-secondary)]">
            {mainView === "mock-server"
              ? "Create mock API endpoints for testing. Routes respond with configured data."
              : "Run load tests against your API endpoints. Measure response times and throughput."}
          </p>
        </div>
      )}

      {/* Import Dialog */}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </aside>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
