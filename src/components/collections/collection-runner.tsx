"use client";

import { useState, useRef } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { X, Play, Square, CheckCircle, XCircle, Clock, Upload, FileJson, FileSpreadsheet, Trash2, FileText } from "lucide-react";
import { RunReport } from "./run-report";

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
  iteration?: number;
}

type IterationData = Record<string, string>[];

export function CollectionRunner({ collectionId, onClose }: CollectionRunnerProps) {
  const { collections } = useCollectionStore();
  const { interpolate } = useEnvironmentStore();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [delay, setDelay] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [iterationData, setIterationData] = useState<IterationData>([]);
  const [dataFileName, setDataFileName] = useState<string>("");
  const [activeResultTab, setActiveResultTab] = useState<"list" | "summary">("list");
  const [showReport, setShowReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const collection = collections.find((c) => c.id === collectionId);
  if (!collection) return null;

  const allRequests = getAllRequests(collection);
  const totalIterations = iterationData.length || 1;

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setIterationData(parsed);
            setDataFileName(file.name);
          } else {
            alert("JSON file must contain an array of objects");
          }
        } else if (file.name.endsWith(".csv")) {
          const parsed = parseCSV(content);
          setIterationData(parsed);
          setDataFileName(file.name);
        }
      } catch {
        alert("Failed to parse file. Ensure it's valid JSON or CSV.");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const interpolateWithData = (text: string, dataRow?: Record<string, string>) => {
    let result = interpolate(text);
    if (dataRow) {
      // Replace {{data.key}} patterns with iteration data
      result = result.replace(/\{\{\s*data\.([^}]+?)\s*\}\}/g, (match, key) => {
        const trimmed = key.trim();
        return trimmed in dataRow ? dataRow[trimmed] : match;
      });
      // Also replace {{key}} if it matches data keys (lower priority than env vars)
      result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
        const trimmed = key.trim();
        return trimmed in dataRow ? dataRow[trimmed] : match;
      });
    }
    return result;
  };

  const runCollection = async () => {
    setIsRunning(true);
    setResults([]);
    abortRef.current = false;

    const iterations = iterationData.length > 0 ? iterationData : [undefined];

    for (let iter = 0; iter < iterations.length; iter++) {
      if (abortRef.current) break;
      setCurrentIteration(iter);
      const dataRow = iterations[iter];

      for (let i = 0; i < allRequests.length; i++) {
        if (abortRef.current) break;
        setCurrentIndex(i);
        const req = allRequests[i];

        try {
          const resolvedUrl = interpolateWithData(req.url, dataRow);
          const activeHeaders: Record<string, string> = {};
          req.headers
            .filter((h) => h.enabled && h.key.trim())
            .forEach((h) => {
              activeHeaders[interpolateWithData(h.key, dataRow)] = interpolateWithData(h.value, dataRow);
            });

          const resolvedBody = req.bodyType !== "none" ? interpolateWithData(req.body, dataRow) : undefined;

          const startTime = performance.now();
          const res = await fetch("/api/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: req.method,
              url: resolvedUrl,
              headers: activeHeaders,
              body: resolvedBody,
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
              iteration: iterationData.length > 0 ? iter + 1 : undefined,
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
              iteration: iterationData.length > 0 ? iter + 1 : undefined,
            },
          ]);
        }

        // Delay between requests
        if (delay > 0 && !(iter === iterations.length - 1 && i === allRequests.length - 1)) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
    setCurrentIteration(0);
  };

  const stopRun = () => {
    abortRef.current = true;
    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const avgTime = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.time, 0) / results.length) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Collection Runner</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {collection.name} • {allRequests.length} requests
              {iterationData.length > 0 && ` • ${iterationData.length} iterations`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] px-5 py-3">
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

          {/* Data File */}
          <div className="flex items-center gap-2">
            {dataFileName ? (
              <div className="flex items-center gap-1.5 rounded bg-[var(--bg-tertiary)] px-2 py-1">
                {dataFileName.endsWith(".csv") ? <FileSpreadsheet size={12} className="text-green-400" /> : <FileJson size={12} className="text-blue-400" />}
                <span className="text-xs text-[var(--text-primary)]">{dataFileName}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">({iterationData.length} rows)</span>
                <button
                  type="button"
                  onClick={() => { setIterationData([]); setDataFileName(""); }}
                  className="ml-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                  aria-label="Remove data file"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Upload size={12} /> Import Data (CSV/JSON)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileImport}
              className="hidden"
              aria-label="Import iteration data file"
            />
          </div>

          {/* Run/Stop */}
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
              <Play size={12} /> Run {totalIterations > 1 ? `(${totalIterations}x)` : "All"}
            </button>
          )}
        </div>

        {/* Progress indicator */}
        {isRunning && (
          <div className="border-b border-[var(--border)] px-5 py-1.5">
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
              <span>Iteration {currentIteration + 1}/{totalIterations}</span>
              <span>•</span>
              <span>Request {currentIndex + 1}/{allRequests.length}</span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${(results.length / (allRequests.length * totalIterations)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 border-b border-[var(--border)] px-5 py-2">
            <span className="flex items-center gap-1 text-xs text-[var(--success)]">
              <CheckCircle size={12} /> {passedCount} passed
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--error)]">
              <XCircle size={12} /> {failedCount} failed
            </span>
            <span className="text-xs text-[var(--text-secondary)]">Avg: {avgTime}ms</span>

            {/* Tab toggle */}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-tertiary)]`}
              >
                <FileText size={10} /> Report
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab("list")}
                className={`rounded px-2 py-0.5 text-[10px] ${activeResultTab === "list" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab("summary")}
                className={`rounded px-2 py-0.5 text-[10px] ${activeResultTab === "summary" ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
              >
                Summary
              </button>
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-[400px] overflow-auto">
          {activeResultTab === "list" && (
            <>
              {(results.length > 0 ? results : allRequests.map((r) => ({ ...r, requestId: r.id, status: 0, time: 0, passed: false, url: r.url, iteration: undefined }))).map((item, i) => {
                const result = results[i];
                const req = allRequests[i % allRequests.length];
                const isCurrent = !result && i === currentIndex + (currentIteration * allRequests.length);

                if (!result && results.length > 0 && i < results.length) return null;
                if (results.length === 0) {
                  // Show pending state
                  return (
                    <div
                      key={`pending-${req.id}-${i}`}
                      className={`flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5 ${isCurrent ? "bg-[var(--bg-tertiary)]" : ""}`}
                    >
                      <div className="w-5">
                        {isCurrent ? (
                          <svg className="h-4 w-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <Clock size={14} className="text-[var(--text-secondary)] opacity-30" />
                        )}
                      </div>
                      <span className={`min-w-[40px] text-[10px] font-bold ${getMethodColor(req.method)}`}>{req.method}</span>
                      <div className="flex flex-1 flex-col">
                        <span className="text-xs text-[var(--text-primary)]">{req.name}</span>
                        <span className="truncate text-[10px] text-[var(--text-secondary)]">{req.url}</span>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {results.map((result, i) => (
                <div
                  key={`result-${i}`}
                  className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2.5"
                >
                  <div className="w-5">
                    {result.passed ? (
                      <CheckCircle size={14} className="text-[var(--success)]" />
                    ) : (
                      <XCircle size={14} className="text-[var(--error)]" />
                    )}
                  </div>
                  {result.iteration && (
                    <span className="min-w-[20px] rounded bg-[var(--bg-tertiary)] px-1 text-center text-[9px] text-[var(--text-secondary)]">
                      #{result.iteration}
                    </span>
                  )}
                  <span className={`min-w-[40px] text-[10px] font-bold ${getMethodColor(result.method)}`}>{result.method}</span>
                  <div className="flex flex-1 flex-col">
                    <span className="text-xs text-[var(--text-primary)]">{result.name}</span>
                    <span className="truncate text-[10px] text-[var(--text-secondary)]">{result.url}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={result.passed ? "text-[var(--success)]" : "text-[var(--error)]"}>
                      {result.status || "ERR"}
                    </span>
                    <span className="text-[var(--text-secondary)]">{result.time}ms</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeResultTab === "summary" && results.length > 0 && (
            <div className="p-4">
              <IterationSummary results={results} totalIterations={totalIterations} requests={allRequests} />
            </div>
          )}
        </div>

        {/* Data Preview */}
        {iterationData.length > 0 && results.length === 0 && !isRunning && (
          <div className="border-t border-[var(--border)] px-5 py-3">
            <p className="mb-2 text-[10px] font-medium text-[var(--text-secondary)]">
              Data Preview (first 3 rows) — Use {"{{data.columnName}}"} in requests
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-2 py-1 text-left text-[var(--text-secondary)]">#</th>
                    {Object.keys(iterationData[0] || {}).map((key) => (
                      <th key={key} className="px-2 py-1 text-left text-[var(--accent)]">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {iterationData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      <td className="px-2 py-1 text-[var(--text-secondary)]">{i + 1}</td>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-2 py-1 text-[var(--text-primary)]">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {iterationData.length > 3 && (
                <p className="mt-1 text-[9px] text-[var(--text-secondary)]">...and {iterationData.length - 3} more rows</p>
              )}
            </div>
          </div>
        )}

        {/* Run Report Modal */}
        {showReport && (
          <RunReport
            collectionName={collection.name}
            results={results}
            totalIterations={totalIterations}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </div>
  );
}

function IterationSummary({ results, totalIterations, requests }: { results: RunResult[]; totalIterations: number; requests: RequestItem[] }) {
  // Group results by iteration
  const iterationGroups: Record<number, RunResult[]> = {};
  results.forEach((r) => {
    const iter = r.iteration || 1;
    if (!iterationGroups[iter]) iterationGroups[iter] = [];
    iterationGroups[iter].push(r);
  });

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(iterationGroups).map(([iter, iterResults]) => {
        const passed = iterResults.filter((r) => r.passed).length;
        const total = iterResults.length;
        const avgTime = Math.round(iterResults.reduce((a, r) => a + r.time, 0) / total);
        const allPassed = passed === total;

        return (
          <div key={iter} className={`rounded-lg border px-4 py-2.5 ${allPassed ? "border-green-900/30 bg-green-900/5" : "border-red-900/30 bg-red-900/5"}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {totalIterations > 1 ? `Iteration #${iter}` : "Results"}
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[var(--success)]">{passed}/{total} passed</span>
                <span className="text-[var(--text-secondary)]">Avg: {avgTime}ms</span>
              </div>
            </div>
          </div>
        );
      })}
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const data: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || "").trim();
    });
    data.push(row);
  }

  return data;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
