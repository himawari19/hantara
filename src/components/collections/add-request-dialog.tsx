"use client";

import { useState } from "react";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const methodColors: Record<string, string> = {
  GET: "text-green-400",
  POST: "text-yellow-400",
  PUT: "text-blue-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-gray-400",
  OPTIONS: "text-cyan-400",
};

interface AddRequestDialogProps {
  onAdd: (data: { name: string; method: string; url: string }) => void;
  onClose: () => void;
}

export function AddRequestDialog({ onAdd, onClose }: AddRequestDialogProps) {
  const [name, setName] = useState("New Request");
  const [method, setMethod] = useState<string>("GET");
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name: name.trim() || "Untitled", method, url });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-sm font-bold text-[var(--text-primary)]">Add Request</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="req-name" className="text-xs text-[var(--text-secondary)]">Name</label>
            <input
              id="req-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoFocus
            />
          </div>

          {/* Method */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">Method</label>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded px-3 py-1.5 text-xs font-bold transition-colors ${
                    method === m
                      ? `bg-[var(--bg-tertiary)] ring-1 ring-[var(--accent)] ${methodColors[m]}`
                      : `text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:${methodColors[m]}`
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* URL (optional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="req-url" className="text-xs text-[var(--text-secondary)]">URL (optional)</label>
            <input
              id="req-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Actions */}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
