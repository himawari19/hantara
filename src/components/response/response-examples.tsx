"use client";

import { useState } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { useResponseStore, ResponseData } from "@/store/response-store";
import { Save, Trash2, Eye } from "lucide-react";

export interface SavedExample {
  id: string;
  name: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  savedAt: number;
}

// Store examples in localStorage keyed by request ID
function getExamples(requestId: string): SavedExample[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(`hantara-examples-${requestId}`);
  return stored ? JSON.parse(stored) : [];
}

function saveExamples(requestId: string, examples: SavedExample[]) {
  localStorage.setItem(`hantara-examples-${requestId}`, JSON.stringify(examples));
}

export function ResponseExamples() {
  const { response } = useResponseStore();
  const { activeRequestId } = useCollectionStore();
  const [examples, setExamples] = useState<SavedExample[]>(() =>
    activeRequestId ? getExamples(activeRequestId) : []
  );
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [viewingExample, setViewingExample] = useState<SavedExample | null>(null);

  if (!activeRequestId) return null;

  const handleSave = () => {
    if (!response || !saveName.trim()) return;

    const example: SavedExample = {
      id: Math.random().toString(36).substring(2, 15),
      name: saveName.trim(),
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      savedAt: Date.now(),
    };

    const updated = [...examples, example];
    setExamples(updated);
    saveExamples(activeRequestId, updated);
    setShowSaveDialog(false);
    setSaveName("");
  };

  const handleDelete = (id: string) => {
    const updated = examples.filter((e) => e.id !== id);
    setExamples(updated);
    saveExamples(activeRequestId, updated);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Save Current Response */}
      {response && !showSaveDialog && (
        <button
          type="button"
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-1.5 self-start rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Save size={12} /> Save as Example
        </button>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Example name (e.g. Success 200)"
            className="flex-1 rounded bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          />
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white hover:bg-[var(--accent-hover)]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowSaveDialog(false)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Saved Examples List */}
      {examples.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">
            Saved Examples ({examples.length})
          </span>
          {examples.map((example) => (
            <div
              key={example.id}
              className="flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1.5"
            >
              <span className={`text-[10px] font-bold ${
                example.status < 300 ? "text-[var(--success)]" : example.status < 400 ? "text-[var(--warning)]" : "text-[var(--error)]"
              }`}>
                {example.status}
              </span>
              <span className="flex-1 truncate text-xs text-[var(--text-primary)]">{example.name}</span>
              <button
                type="button"
                onClick={() => setViewingExample(example)}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--info)]"
                aria-label="View example"
              >
                <Eye size={12} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(example.id)}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label="Delete example"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* View Example Modal */}
      {viewingExample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingExample(null)}>
          <div className="max-h-[70vh] w-full max-w-lg overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{viewingExample.name}</h3>
              <span className={`text-xs font-bold ${
                viewingExample.status < 300 ? "text-[var(--success)]" : "text-[var(--error)]"
              }`}>
                {viewingExample.status} {viewingExample.statusText}
              </span>
            </div>
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)]">
              {viewingExample.body}
            </pre>
            <button
              type="button"
              onClick={() => setViewingExample(null)}
              className="mt-3 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
