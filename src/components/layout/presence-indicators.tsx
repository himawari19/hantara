"use client";

import { usePresenceStore } from "@/store/presence-store";
import { useCollectionStore } from "@/store/collection-store";
import { useState } from "react";
import { Users, Edit3 } from "lucide-react";

export function PresenceIndicators() {
  const { users, localUserId, localUserName, setLocalUser } = usePresenceStore();
  const [showPanel, setShowPanel] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(localUserName);

  const otherUsers = users.filter((u) => u.id !== localUserId);

  if (otherUsers.length === 0) return null;

  return (
    <div className="relative">
      {/* Avatar Stack */}
      <button
        type="button"
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
        title={`${otherUsers.length} collaborator${otherUsers.length > 1 ? "s" : ""} online`}
      >
        <Users size={10} />
        <div className="flex -space-x-1.5">
          {otherUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--bg-secondary)] text-[7px] font-bold text-white"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          {otherUsers.length > 3 && (
            <div className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] text-[7px] text-[var(--text-secondary)]">
              +{otherUsers.length - 3}
            </div>
          )}
        </div>
      </button>

      {/* Panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPanel(false)} />
          <div className="absolute right-0 top-7 z-50 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-2 shadow-lg">
            <div className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Online ({otherUsers.length + 1})
            </div>

            {/* Local user */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{ backgroundColor: usePresenceStore.getState().localUserColor }}
              >
                {localUserName.charAt(0).toUpperCase()}
              </div>
              {editingName ? (
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={() => { setLocalUser(nameInput.trim() || "Anonymous"); setEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setLocalUser(nameInput.trim() || "Anonymous"); setEditingName(false); } }}
                  className="flex-1 rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs text-[var(--text-primary)] outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-xs text-[var(--text-primary)]">{localUserName} (you)</span>
              )}
              {!editingName && (
                <button
                  type="button"
                  onClick={() => { setEditingName(true); setNameInput(localUserName); }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Edit name"
                >
                  <Edit3 size={10} />
                </button>
              )}
            </div>

            {/* Other users */}
            {otherUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2 px-3 py-1.5">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs text-[var(--text-primary)]">{user.name}</span>
                  {user.activeRequestId && (
                    <span className="text-[9px] text-[var(--text-secondary)]">Editing a request</span>
                  )}
                </div>
                <div className="h-2 w-2 rounded-full bg-green-400" title="Online" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Small inline indicator showing who else is viewing the same request */
export function RequestPresenceAvatars({ requestId }: { requestId: string }) {
  const { getActiveUsersOnRequest } = usePresenceStore();
  const activeUsers = getActiveUsersOnRequest(requestId);

  if (activeUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {activeUsers.slice(0, 3).map((user) => (
          <div
            key={user.id}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--bg-primary)] text-[7px] font-bold text-white"
            style={{ backgroundColor: user.color }}
            title={`${user.name} is viewing this`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="text-[9px] text-[var(--text-secondary)]">
        {activeUsers.length === 1 ? activeUsers[0].name : `${activeUsers.length} others`} viewing
      </span>
    </div>
  );
}
