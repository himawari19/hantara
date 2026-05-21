"use client";

import { useState, useMemo } from "react";
import { useVersionStore, RequestSnapshot } from "@/store/version-store";
import { useCollectionStore } from "@/store/collection-store";
import { useRequestStore } from "@/store/request-store";
import { X, Clock, Tag, Trash2, RotateCcw, ArrowLeftRight, Save } from "lucide-react";

interface VersionHistoryProps {
  onClose: () => void;
}

export function VersionHistory({ onClose }: VersionHistoryProps) {
  const { activeRequestId } = useCollectionStore();
  const { method, url, headers, body, bodyType } = useRequestStore();
  const { getSnapshots, saveSnapshot, removeSnapshot, clearSnapshots, labelSnapshot } = useVersionStore();
  const { setMethod, setUrl, setHeaders, setBody, setBodyType } = useRequestStore();
  const { updateRequest } = useCollectionStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [labelingId, setLabelingId] = useState<string | null>(null);

  if (!activeRequestId) return null;

  const snapshots = getSnapshots(activeRequestId);
  const selected = snapshots.find((s) => s.id === selectedId);
  const compareSnapshot = snapshots.find((s) => s.id === compareId);

  const handleSaveNow = () => {
    saveSnapshot(activeRequestId, {
      requestId: activeRequestId,
      name: "Manual save",
      method,
      url,
      headers,
      body,
      bodyType,
      authType: "none",
      authConfig: {},
    });
  };

  const handleRestore = (snapshot: RequestSnapshot) => {
    setMethod(snapshot.method as any);
    setUrl(snapshot.url);
    setHeaders(snapshot.headers);
    setBody(snapshot.body);
    setBodyType(snapshot.bodyType as any);
    updateRequest(activeRequestId, {
      method: snapshot.method as any,
      url: snapshot.url,
      headers: snapshot.headers,
      body: snapshot.body,
      bodyType: snapshot.bodyType as any,
    });
  };

  const handleLabel = (snapshotId: string) => {
    if (labelInput.trim()) {
      labelSnapshot(activeRequestId, snapshotId, labelInput.trim());
      setLabelingId(null);
      setLabelInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Version History</h2>
            <span className="text-xs text-[var(--text-secondary)]">({snapshots.length} versions)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveNow}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1 text-xs text-white hover:bg-[var(--accent-hover)]"
            >
              <Save size={12} /> Save Current
            </button>
            <button
              type="button"
              onClick={() => setCompareMode(!compareMode)}
              className={`flex items-center gap-1 rounded px-3 py-1 text-xs ${
                compareMode ? "bg-purple-600 text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ArrowLeftRight size={12} /> Compare
            </button>
            <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Snapshot List */}
          <div className="w-72 flex-shrink-0 overflow-auto border-r border-[var(--border)]">
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                <Clock size={24} className="text-[var(--text-secondary)] opacity-40" />
                <p className="text-xs text-[var(--text-secondary)]">No versions saved yet</p>
                <p className="text-[10px] text-[var(--text-secondary)]">Versions are saved automatically when you send a request</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`flex cursor-pointer flex-col gap-1 border-b border-[var(--border)] px-3 py-2.5 ${
                      selectedId === snapshot.id ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]/50"
                    }`}
                    onClick={() => {
                      if (compareMode) {
                        if (!selectedId) setSelectedId(snapshot.id);
                        else if (!compareId && snapshot.id !== selectedId) setCompareId(snapshot.id);
                        else { setSelectedId(snapshot.id); setCompareId(null); }
                      } else {
                        setSelectedId(snapshot.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${getMethodColor(snapshot.method)}`}>
                        {snapshot.method}
                      </span>
                      {snapshot.label && (
                        <span className="rounded bg-[var(--accent)]/20 px-1.5 py-0.5 text-[9px] text-[var(--accent)]">
                          {snapshot.label}
                        </span>
                      )}
                      {compareMode && (selectedId === snapshot.id || compareId === snapshot.id) && (
                        <span className="rounded bg-purple-600/20 px-1 text-[9px] text-purple-400">
                          {selectedId === snapshot.id ? "A" : "B"}
                        </span>
                      )}
                    </div>
                    <span className="truncate text-[10px] text-[var(--text-secondary)]">{snapshot.url || "No URL"}</span>
                    <span className="text-[9px] text-[var(--text-secondary)] opacity-60">
                      {formatTimestamp(snapshot.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail / Diff View */}
          <div className="flex flex-1 flex-col overflow-auto">
            {compareMode && selected && compareSnapshot ? (
              <DiffView snapshotA={selected} snapshotB={compareSnapshot} />
            ) : selected ? (
              <SnapshotDetail
                snapshot={selected}
                onRestore={() => handleRestore(selected)}
                onDelete={() => { removeSnapshot(activeRequestId, selected.id); setSelectedId(null); }}
                onLabel={() => setLabelingId(selected.id)}
                labelingId={labelingId}
                labelInput={labelInput}
                setLabelInput={setLabelInput}
                onLabelSave={() => handleLabel(selected.id)}
                onLabelCancel={() => setLabelingId(null)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-xs text-[var(--text-secondary)]">
                {compareMode ? "Select two versions to compare" : "Select a version to view details"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotDetail({
  snapshot,
  onRestore,
  onDelete,
  onLabel,
  labelingId,
  labelInput,
  setLabelInput,
  onLabelSave,
  onLabelCancel,
}: {
  snapshot: RequestSnapshot;
  onRestore: () => void;
  onDelete: () => void;
  onLabel: () => void;
  labelingId: string | null;
  labelInput: string;
  setLabelInput: (v: string) => void;
  onLabelSave: () => void;
  onLabelCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1.5 text-xs text-white hover:bg-[var(--accent-hover)]"
        >
          <RotateCcw size={12} /> Restore
        </button>
        {labelingId === snapshot.id ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onLabelSave(); if (e.key === "Escape") onLabelCancel(); }}
              placeholder="Label name..."
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              autoFocus
            />
            <button type="button" onClick={onLabelSave} className="text-xs text-[var(--accent)]">Save</button>
            <button type="button" onClick={onLabelCancel} className="text-xs text-[var(--text-secondary)]">Cancel</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLabel}
            className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Tag size={12} /> Label
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded px-3 py-1.5 text-xs text-[var(--error)] hover:bg-red-900/10"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>

      {/* Snapshot Info */}
      <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
        <div className="grid grid-cols-[80px_1fr] gap-2 text-xs">
          <span className="text-[var(--text-secondary)]">Method</span>
          <span className={`font-bold ${getMethodColor(snapshot.method)}`}>{snapshot.method}</span>
          <span className="text-[var(--text-secondary)]">URL</span>
          <span className="break-all font-mono text-[var(--text-primary)]">{snapshot.url || "—"}</span>
          <span className="text-[var(--text-secondary)]">Saved</span>
          <span className="text-[var(--text-primary)]">{new Date(snapshot.timestamp).toLocaleString()}</span>
          <span className="text-[var(--text-secondary)]">Headers</span>
          <span className="text-[var(--text-primary)]">{snapshot.headers.filter((h) => h.enabled && h.key.trim()).length} active</span>
        </div>
      </div>

      {/* Body Preview */}
      {snapshot.body && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Body ({snapshot.bodyType})</span>
          <pre className="max-h-[200px] overflow-auto rounded border border-[var(--border)] bg-[var(--bg-primary)] p-3 font-mono text-[10px] text-[var(--text-primary)]">
            {snapshot.body}
          </pre>
        </div>
      )}

      {/* Headers */}
      {snapshot.headers.filter((h) => h.enabled && h.key.trim()).length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Headers</span>
          <div className="rounded border border-[var(--border)] bg-[var(--bg-primary)] p-2">
            {snapshot.headers.filter((h) => h.enabled && h.key.trim()).map((h, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="font-medium text-[var(--info)]">{h.key}:</span>
                <span className="text-[var(--text-secondary)]">{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ snapshotA, snapshotB }: { snapshotA: RequestSnapshot; snapshotB: RequestSnapshot }) {
  const urlDiff = snapshotA.url !== snapshotB.url;
  const methodDiff = snapshotA.method !== snapshotB.method;
  const bodyDiff = snapshotA.body !== snapshotB.body;

  const bodyDiffLines = useMemo(() => {
    if (!bodyDiff) return [];
    return computeLineDiff(snapshotA.body, snapshotB.body);
  }, [snapshotA.body, snapshotB.body, bodyDiff]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
        <span className="rounded bg-purple-600/20 px-1.5 text-purple-400">A: {formatTimestamp(snapshotA.timestamp)}</span>
        <span>vs</span>
        <span className="rounded bg-purple-600/20 px-1.5 text-purple-400">B: {formatTimestamp(snapshotB.timestamp)}</span>
      </div>

      {/* Method/URL diff */}
      {(methodDiff || urlDiff) && (
        <div className="rounded border border-[var(--border)] p-3">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Request</span>
          {methodDiff && (
            <div className="mt-1 flex gap-2 text-xs">
              <span className="rounded bg-red-900/20 px-1 text-red-400 line-through">{snapshotA.method}</span>
              <span>→</span>
              <span className="rounded bg-green-900/20 px-1 text-green-400">{snapshotB.method}</span>
            </div>
          )}
          {urlDiff && (
            <div className="mt-1 flex flex-col gap-0.5 font-mono text-[10px]">
              <span className="text-red-400 line-through">{snapshotA.url}</span>
              <span className="text-green-400">{snapshotB.url}</span>
            </div>
          )}
        </div>
      )}

      {/* Body diff */}
      {bodyDiff && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Body Changes</span>
          <div className="max-h-[300px] overflow-auto rounded border border-[var(--border)] bg-[var(--bg-primary)] p-2 font-mono text-[10px]">
            {bodyDiffLines.map((line, i) => (
              <div
                key={i}
                className={`px-1 ${
                  line.type === "added" ? "bg-green-900/20 text-green-400" :
                  line.type === "removed" ? "bg-red-900/20 text-red-400" :
                  "text-[var(--text-secondary)]"
                }`}
              >
                <span className="mr-2 inline-block w-3 text-right opacity-50">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </span>
                {line.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {!methodDiff && !urlDiff && !bodyDiff && (
        <div className="flex items-center justify-center p-6 text-xs text-[var(--text-secondary)]">
          No differences found between these versions
        </div>
      )}
    </div>
  );
}

function computeLineDiff(a: string, b: string): { type: "added" | "removed" | "same"; text: string }[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const result: { type: "added" | "removed" | "same"; text: string }[] = [];
  const maxLen = Math.max(aLines.length, bLines.length);

  for (let i = 0; i < maxLen; i++) {
    const l = aLines[i];
    const r = bLines[i];
    if (l === undefined && r !== undefined) result.push({ type: "added", text: r });
    else if (r === undefined && l !== undefined) result.push({ type: "removed", text: l });
    else if (l === r) result.push({ type: "same", text: l });
    else { result.push({ type: "removed", text: l }); result.push({ type: "added", text: r }); }
  }
  return result;
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = { GET: "text-green-400", POST: "text-yellow-400", PUT: "text-blue-400", PATCH: "text-purple-400", DELETE: "text-red-400" };
  return colors[method] || "text-gray-400";
}

function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
