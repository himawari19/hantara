"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { RequestHeader } from "./request-header";
import { RequestPanel } from "../request/request-panel";
import { ResponsePanel } from "../response/response-panel";
import { ResizablePanel } from "./resizable-panel";
import { StatusBar } from "./status-bar";
import { ConsolePanel } from "../console/console-panel";
import { ShortcutsPanel } from "../shortcuts/shortcuts-panel";
import { CodeGeneratorDialog } from "../code-generator/code-generator-dialog";
import { SearchDialog } from "../search/search-dialog";
import { CookieManager } from "../cookies/cookie-manager";
import { MockServerPanel } from "../mock/mock-server-panel";
import { LoadTestPanel } from "../performance/load-test-panel";
import { MonitorPanel } from "../monitor/monitor-panel";
import { DocsGenerator } from "../docs/docs-generator";
import { useShortcutsStore } from "@/store/shortcuts-store";
import { useRequestStore } from "@/store/request-store";
import { useThemeStore } from "@/store/theme-store";
import { useTabStore } from "@/store/tab-store";

type MainView = "request" | "mock-server" | "load-test" | "monitor";

export function AppShell() {
  const [showConsole, setShowConsole] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainView, setMainView] = useState<MainView>("request");
  const { showPanel: showShortcuts, togglePanel: toggleShortcuts } = useShortcutsStore();
  const { sendRequest } = useRequestStore();
  const { theme } = useThemeStore();
  const { tabs } = useTabStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); sendRequest(); }
      if (e.ctrlKey && e.key === "k") { e.preventDefault(); setShowSearch(true); }
      if (e.ctrlKey && e.key === "b") { e.preventDefault(); setSidebarCollapsed((prev) => !prev); }
      if (e.ctrlKey && e.key === "`") { e.preventDefault(); setShowConsole((prev) => !prev); }
      if (e.ctrlKey && e.shiftKey && e.key === "C") { e.preventDefault(); setShowCodeGen(true); }
      if (e.ctrlKey && e.key === "/") { e.preventDefault(); toggleShortcuts(); }
      if (e.ctrlKey && e.shiftKey && e.key === "K") { e.preventDefault(); setShowCookies(true); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sendRequest, toggleShortcuts]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mainView={mainView}
          onViewChange={setMainView}
          onShowCookies={() => setShowCookies(true)}
          onShowDocs={() => setShowDocs(true)}
        />

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {mainView === "request" && (
            <>
              {/* Tab Bar */}
              <TabBar />

              {tabs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[var(--text-secondary)]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium">No open requests</p>
                    <p className="mt-1 text-xs opacity-70">
                      Open a request from the collection sidebar or create a new one
                    </p>
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-1 text-[10px] opacity-50">
                    <span>Ctrl+K to search</span>
                    <span>Ctrl+N to create new request</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Request Header */}
                  <RequestHeader
                    onShowCodeGen={() => setShowCodeGen(true)}
                    onShowSearch={() => setShowSearch(true)}
                  />

                  {/* Resizable Request + Response split */}
                  <ResizablePanel
                    direction="vertical"
                    defaultRatio={0.45}
                    minSize={150}
                    className="flex-1 overflow-hidden"
                    first={<RequestPanel />}
                    second={<ResponsePanel />}
                  />
                </>
              )}
            </>
          )}

          {mainView === "mock-server" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center border-b border-[var(--border)] px-4 py-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Mock Servers</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <MockServerPanel />
              </div>
            </div>
          )}

          {mainView === "load-test" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center border-b border-[var(--border)] px-4 py-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Load Testing</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <LoadTestPanel />
              </div>
            </div>
          )}

          {mainView === "monitor" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center border-b border-[var(--border)] px-4 py-2">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">API Monitoring</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <MonitorPanel />
              </div>
            </div>
          )}

          {/* Console Panel */}
          {showConsole && <ConsolePanel onClose={() => setShowConsole(false)} />}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar onToggleConsole={() => setShowConsole(!showConsole)} showConsole={showConsole} />

      {/* Modals */}
      {showShortcuts && <ShortcutsPanel />}
      {showCodeGen && <CodeGeneratorDialog onClose={() => setShowCodeGen(false)} />}
      {showSearch && <SearchDialog onClose={() => setShowSearch(false)} />}
      {showCookies && <CookieManager onClose={() => setShowCookies(false)} />}
      {showDocs && <DocsGenerator onClose={() => setShowDocs(false)} />}
    </div>
  );
}
