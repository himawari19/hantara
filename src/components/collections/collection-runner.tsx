"use client";

import { useState } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { X, Play, Square, CheckCircle, XCircle, Clock } from "lucide-react";

interface CollectionRunnerProps {
  collectionId: string;
  onClose: () => void;
}

interface RunResult {
  requestId: string;
  name: string;
  method: string;
  url: string;
  status: number;
  time: number;
  passed: boolean;
  error?: string;
}

export function CollectionRunner({ collectionId, onClose }: CollectionRunnerProps) {
  const { collections } = useCollectionStore();
  const { interpolate } = useEnvironmentStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [delay, setDelay] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return null;

  const allRequests = getAllRequests(collection);

  const runCollection = async () => {
    setIsRunning(true);
    setResults([]);

    for (let i = 0; i < allRequests.length; i++) {
      setCurrentIndex(i);
      const req = allRequests[i];

      try {
        const resolvedUrl = interpolate(req.url);
        const activeHeaders: Record<string, string> = {};
        req.headers
          .filter((h) => h.enabled && h.key.trim())
          .forEach((h) => {
            activeHeaders[interpolate(h.key)] = interpolate(h.value);
          });

        const startTime = performance.now();
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: req.method,
            url: resolvedUrl,
            headers: activeHeaders,
            body: req.bodyType !== "none" ? interpolate(req.body) : undefined,
          }),
        });

        const data = await res.json();
        const time = Math.round(performance.now() - startTime);

        setResults((prev) => [
          ...prev,
          {
            requestId: req.id,
            name: req.name,
            method: req.method,
            url: resolvedUrl,
            status: data.status,
            time,
            passed: data.status >= 200 && data.status < 400,
          },
        ]);
      } catch (err: any) {
        setResults((prev) => [
          ...prev,
          {
            requestId: req.id,
            name: req.name,
            method: req.method,
            url: req.url,
            status: 0,
            time: 0,
            passed: false,
            error: err.message,
          },
        ]);
      }

      // Delay between requests
      if (delay > 0 && i < allRequests.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const stopRun = () => {
    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Collection Runner</h3>
            <p className="text-xs text-[var(--text-secondary)]">{collection.name} • {allRequests.length} requests</p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Delay (ms):</label>
            <input
              type="number"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
              min={0}
              step={100}
              aria-label="Delay between requests in milliseconds"
              className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
            />
          </div>

          {isRunning ? (
            <button
              type="button"
              onClick={stopRun}
              className="flex items-center gap-1.5 rounded bg-[var(--error)] px-4 py-1.5 text-xs font-bold text-white"
            >
              <Square size={12} /> Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={runCollection}
              className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
            >
              <Play size={12} /> Run All
            </button>
          )}

          {results.length > 0 && (
            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-[var(--success)]">
                <CheckCircle size={12} /> {passedCount} passed
              </span>
              <span className="flex items-center gap-1 text-[var(--error)]">
                <XCircle size={12} /> {failedCount} failed
              </span>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-auto">
          {allRequests.map((req, i) => {
            const result = results.find((r) => r.requestId === req.id);
            const isCurrent = i === currentIndex;

            return (
              <div
                key={req.id}
                className={`flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 ${
                  isCurrent ? "bg-[var(--bg-tertiary)]" : ""
                }`}
              >
                {/* Status Icon */}
                <div className="w-5">
                  {result ? (
                    result.passed ? (
                      <CheckCircle size={14} className="text-[var(--success)]" />
                    ) : (
                      <XCircle size={14} className="text-[var(--error)]" />
                    )
                  ) : isCurrent ? (
                    <svg className="h-4 w-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Clock size={14} className="text-[var(--text-secondary)] opacity-30" />
                  )}
                </div>

                {/* Method */}
                <span className={`min-w-[40px] text-[10px] font-bold ${getMethodColor(req.method)}`}>
                  {req.method}
                </span>

                {/* Name & URL */}
                <div className="flex flex-1 flex-col">
                  <span className="text-xs text-[var(--text-primary)]">{req.name}</span>
                  <span className="truncate text-[10px] text-[var(--text-secondary)]">{req.url}</span>
                </div>

                {/* Result */}
                {result && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={result.passed ? "text-[var(--success)]" : "text-[var(--error)]"}>
                      {result.status || "ERR"}
                    </span>
                    <span className="text-[var(--text-secondary)]">{result.time}ms</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getAllRequests(collection: Collection): RequestItem[] {
  const requests: RequestItem[] = [...collection.requests];

  function collectFromFolders(folders: Folder[]) {
    folders.forEach((folder) => {
      requests.push(...folder.requests);
      collectFromFolders(folder.folders);
    });
  }

  collectFromFolders(collection.folders);
  return requests;
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
  };
  return colors[method] || "text-gray-400";
}
