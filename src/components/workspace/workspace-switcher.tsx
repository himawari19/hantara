"use client";

import { useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Plus, Check, Trash2 } from "lucide-react";

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  addWorkspace: (name: string) => void;
  removeWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveWorkspace: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [{ id: "default", name: "My Workspace", createdAt: Date.now() }],
      activeWorkspaceId: "default",

      addWorkspace: (name) => {
        const ws: Workspace = { id: generateId(), name, createdAt: Date.now() };
        set((state) => ({ workspaces: [...state.workspaces, ws] }));
      },

      removeWorkspace: (id) => {
        const { workspaces, activeWorkspaceId } = get();
        if (workspaces.length <= 1) return; // Can't delete last workspace
        const filtered = workspaces.filter((w) => w.id !== id);
        set({
          workspaces: filtered,
          activeWorkspaceId: activeWorkspaceId === id ? filtered[0].id : activeWorkspaceId,
        });
      },

      renameWorkspace: (id, name) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
        }));
      },

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: "hantara-workspaces" }
  )
);

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspaceId, addWorkspace, removeWorkspace, setActiveWorkspace } =
    useWorkspaceStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
        </svg>
        <span className="max-w-[120px] truncate">{activeWorkspace?.name || "Workspace"}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { setActiveWorkspace(ws.id); setShowDropdown(false); }}
                  className="flex flex-1 items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                >
                  {ws.id === activeWorkspaceId && <Check size={12} className="text-[var(--accent)]" />}
                  {ws.id !== activeWorkspaceId && <span className="w-3" />}
                  <span className="truncate">{ws.name}</span>
                </button>
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkspace(ws.id)}
                    className="mr-2 rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                    aria-label="Delete workspace"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}

            <div className="my-1 border-t border-[var(--border)]" />

            {showAdd ? (
              <div className="flex items-center gap-1 px-3 py-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      addWorkspace(newName.trim());
                      setNewName("");
                      setShowAdd(false);
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                <Plus size={12} /> New Workspace
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
