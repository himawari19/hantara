"use client";

import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "./sidebar";
import { RequestPanel } from "../request/request-panel";
import { ResponsePanel } from "../response/response-panel";

export function AppShell() {
  const { isLoading } = useAuthStore();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--accent)]">Hantara</h1>
          <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar - Collection Tree */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Request Panel */}
        <div className="flex-1 overflow-auto border-b border-[var(--border)]">
          <RequestPanel />
        </div>

        {/* Response Panel */}
        <div className="flex-1 overflow-auto">
          <ResponsePanel />
        </div>
      </div>
    </div>
  );
}
