"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export function UserMenu() {
  const { user, localUser, isAuthenticated, signOut } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAuthenticated) return null;

  const displayName = localUser
    ? localUser.name
    : user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "User";

  const email = localUser?.email || user?.email || "";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const role = localUser?.role;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--bg-tertiary)]"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm text-[var(--text-primary)]">{displayName}</span>
        {role === "admin" && (
          <span className="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">
            ADMIN
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
          <div className="border-b border-[var(--border)] px-3 py-2">
            <p className="text-xs font-medium text-[var(--text-primary)]">{displayName}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{email}</p>
          </div>
          <button
            type="button"
            onClick={() => { signOut(); setIsOpen(false); window.location.href = "/"; }}
            className="flex w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
