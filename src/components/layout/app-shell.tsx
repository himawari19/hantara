"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { TabBar } from "./tab-bar";
import { RequestHeader } from "./request-header";
import { RequestPanel } from "../request/request-panel";
import { ResponsePanel } from "../response/response-panel";
import { ResizablePanel } from "./resizable-panel";
import { StatusBar } from "./status-bar";
import { OfflineBanner } from "./offline-banner";
import { ToastContainer } from "../toast/toast-container";
import { useShortcutsStore } from "@/store/shortcuts-store";
import { useRequestStore } from "@/store/request-store";
import { useThemeStore } from "@/store/theme-store";
import { useTabStore } from "@/store/tab-store";

// Lazy load heavy panels & modals — only loaded when user opens them
const ConsolePanel = lazy(() => import("../console/console-panel").then(m => ({ default: m.ConsolePanel })));
const ShortcutsPanel = lazy(() => import("../shortcuts/shortcuts-panel").then(m => ({ default: m.ShortcutsPanel })));
const CodeGeneratorDialog = lazy(() => import("../code-generator/code-generator-dialog").then(m => ({ default: m.CodeGeneratorDialog })));
const SearchDialog = lazy(() => import("../search/search-dialog").then(m => ({ default: m.SearchDialog })));
const CookieManager = lazy(() => import("../cookies/cookie-manager").then(m => ({ default: m.CookieManager })));
const MockServerPanel = lazy(() => import("../mock/mock-server-panel").then(m => ({ default: m.MockServerPanel })));
const LoadTestPanel = lazy(() => import("../performance/load-test-panel").then(m => ({ default: m.LoadTestPanel })));
const MonitorPanel = lazy(() => import("../monitor/monitor-panel").then(m => ({ default: m.MonitorPanel })));
const DocsGenerator = lazy(() => import("../docs/docs-generator").then(m => ({ default: m.DocsGenerator })));
const VersionHistory = lazy(() => import("../request/version-history").then(m => ({ default: m.VersionHistory })));
const SyncHealthPanel = lazy(() => import("../sync/sync-health-panel").then(m => ({ default: m.SyncHealthPanel })));

import { PresenceProvider } from "../providers/presence-provider";
import { PresenceIndicators } from "./presence-indicators";
import { useVersionStore } from "@/store/version-store";
import { useCollectionStore } from "@/store/collection-store";

type MainView = "request" | "mock-server" | "load-test" | "monitor";

export function AppShell() {
  const [showConsole, setShowConsole] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showSyncHealth, setShowSyncHealth] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mainView, setMainView] = useState<MainView>("request");
  const { showPanel: showShortcuts, togglePanel: toggleShortcuts } = useShortcutsStore();
  const { sendRequest, method, url, headers, body, bodyType } = useRequestStore();
  const { theme } = useThemeStore();
  const { tabs } = useTabStore();
  const { saveSnapshot } = useVersionStore();
  const { activeRequestId } = useCollectionStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 1024);
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        // Auto-save version snapshot before sending
        if (activeRequestId) {
          saveSnapshot(activeRequestId, { requestId: activeRequestId, name: "Auto-save", method, url, headers, body, bodyType, authType: "none", authConfig: {} });
        }
        sendRequest();
      }
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
      {/* Offline / Reconnecting Banner */}
      <OfflineBanner />

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sidebar */}
        {isMobile ? (
          <>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="fixed left-3 top-3 z-40 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] p-2 shadow-md lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close sidebar overlay"
                />
                <div className="absolute left-0 top-0 flex h-full w-[85vw] max-w-sm flex-col shadow-2xl">
                  <div className="flex items-center justify-end border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
                    <button type="button" onClick={() => setMobileSidebarOpen(false)} className="rounded p-2" aria-label="Close sidebar">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Sidebar
                      collapsed={false}
                      onToggle={() => setSidebarCollapsed((prev) => !prev)}
                      mainView={mainView}
                      onViewChange={(view) => { setMainView(view); setMobileSidebarOpen(false); }}
                      onShowCookies={() => setShowCookies(true)}
                      onShowDocs={() => setShowDocs(true)}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            mainView={mainView}
            onViewChange={setMainView}
            onShowCookies={() => setShowCookies(true)}
            onShowDocs={() => setShowDocs(true)}
          />
        )}

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
                    direction={isMobile ? "horizontal" : "vertical"}
                    defaultRatio={0.45}
                    minSize={isMobile ? 220 : 150}
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
              <div className="flex items-center border-b border-[var(--border)] px-3 py-2 sm:px-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Mock Servers</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<PanelLoader />}>
                  <MockServerPanel />
                </Suspense>
              </div>
            </div>
          )}

          {mainView === "load-test" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center border-b border-[var(--border)] px-3 py-2 sm:px-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Load Testing</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<PanelLoader />}>
                  <LoadTestPanel />
                </Suspense>
              </div>
            </div>
          )}

          {mainView === "monitor" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center border-b border-[var(--border)] px-3 py-2 sm:px-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">API Monitoring</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<PanelLoader />}>
                  <MonitorPanel />
                </Suspense>
              </div>
            </div>
          )}

          {/* Console Panel */}
          {showConsole && (
            <Suspense fallback={<PanelLoader />}>
              <ConsolePanel onClose={() => setShowConsole(false)} />
            </Suspense>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        onToggleConsole={() => setShowConsole(!showConsole)}
        showConsole={showConsole}
        onShowSyncHealth={() => setShowSyncHealth(true)}
      />

      {/* Modals */}
      <Suspense fallback={null}>
        {showShortcuts && <ShortcutsPanel />}
        {showCodeGen && <CodeGeneratorDialog onClose={() => setShowCodeGen(false)} />}
        {showSearch && <SearchDialog onClose={() => setShowSearch(false)} />}
        {showCookies && <CookieManager onClose={() => setShowCookies(false)} />}
        {showDocs && <DocsGenerator onClose={() => setShowDocs(false)} />}
        {showVersionHistory && <VersionHistory onClose={() => setShowVersionHistory(false)} />}
        {showSyncHealth && <SyncHealthPanel onClose={() => setShowSyncHealth(false)} />}
      </Suspense>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

function PanelLoader() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading...
    </div>
  );
}
