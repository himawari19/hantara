"use client";

import { useState } from "react";
import { X, Download, Copy, Check, FileText, FileJson } from "lucide-react";

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

interface RunReportProps {
  collectionName: string;
  results: RunResult[];
  totalIterations: number;
  onClose: () => void;
}

export function RunReport({ collectionName, results, totalIterations, onClose }: RunReportProps) {
  const [copied, setCopied] = useState(false);

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const avgTime = results.length > 0 ? Math.round(results.reduce((a, r) => a + r.time, 0) / results.length) : 0;
  const totalTime = results.reduce((a, r) => a + r.time, 0);

  const exportHTML = () => {
    const html = generateHTMLReport(collectionName, results, totalIterations, passedCount, failedCount, avgTime, totalTime);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.replace(/\s+/g, "-").toLowerCase()}-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const report = {
      collection: collectionName,
      timestamp: new Date().toISOString(),
      summary: { total: results.length, passed: passedCount, failed: failedCount, avgTime, totalTime, iterations: totalIterations },
      results: results.map((r) => ({
        name: r.name,
        method: r.method,
        url: r.url,
        status: r.status,
        time: r.time,
        passed: r.passed,
        error: r.error || null,
        iteration: r.iteration || 1,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collectionName.replace(/\s+/g, "-").toLowerCase()}-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    const report = {
      collection: collectionName,
      timestamp: new Date().toISOString(),
      summary: { total: results.length, passed: passedCount, failed: failedCount, avgTime, totalTime },
      results,
    };
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Run Report</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">{results.length}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Total</div>
          </div>
          <div className="rounded-lg bg-green-900/10 p-3 text-center">
            <div className="text-lg font-bold text-[var(--success)]">{passedCount}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Passed</div>
          </div>
          <div className="rounded-lg bg-red-900/10 p-3 text-center">
            <div className="text-lg font-bold text-[var(--error)]">{failedCount}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Failed</div>
          </div>
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
            <div className="text-lg font-bold text-[var(--text-primary)]">{avgTime}ms</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Avg Time</div>
          </div>
        </div>

        {/* Results Table */}
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-secondary)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">#</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">Method</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">Name</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">Status</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">Time</th>
                <th className="px-4 py-2 text-left text-[10px] font-medium text-[var(--text-secondary)]">Result</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                  <td className="px-4 py-2 text-[var(--text-secondary)]">{i + 1}</td>
                  <td className="px-4 py-2">
                    <span className={`font-bold ${getMethodColor(r.method)}`}>{r.method}</span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-[var(--text-primary)]">{r.name}</td>
                  <td className="px-4 py-2">
                    <span className={r.status >= 200 && r.status < 400 ? "text-[var(--success)]" : "text-[var(--error)]"}>
                      {r.status || "ERR"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">{r.time}ms</td>
                  <td className="px-4 py-2">
                    {r.passed ? (
                      <span className="rounded bg-green-900/20 px-1.5 py-0.5 text-[10px] text-[var(--success)]">PASS</span>
                    ) : (
                      <span className="rounded bg-red-900/20 px-1.5 py-0.5 text-[10px] text-[var(--error)]">FAIL</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={copyJSON}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <FileJson size={12} /> Export JSON
          </button>
          <button
            type="button"
            onClick={exportHTML}
            className="flex items-center gap-1.5 rounded bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
          >
            <Download size={12} /> Export HTML Report
          </button>
        </div>
      </div>
    </div>
  );
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

function generateHTMLReport(
  collectionName: string,
  results: RunResult[],
  totalIterations: number,
  passedCount: number,
  failedCount: number,
  avgTime: number,
  totalTime: number
): string {
  const passRate = results.length > 0 ? Math.round((passedCount / results.length) * 100) : 0;

  const resultRows = results
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="method method-${r.method.toLowerCase()}">${r.method}</span></td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.url)}</td>
      <td class="${r.status >= 200 && r.status < 400 ? "success" : "error"}">${r.status || "ERR"}</td>
      <td>${r.time}ms</td>
      <td><span class="badge ${r.passed ? "badge-pass" : "badge-fail"}">${r.passed ? "PASS" : "FAIL"}</span></td>
      <td>${r.error ? escapeHtml(r.error) : "-"}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(collectionName)} - Run Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e4e4e7; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #1a1b23; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1.25rem; text-align: center; }
    .card-value { font-size: 1.75rem; font-weight: 700; }
    .card-label { font-size: 0.75rem; color: #71717a; margin-top: 0.25rem; }
    .success { color: #22c55e; }
    .error { color: #ef4444; }
    .progress-bar { height: 8px; background: #27272a; border-radius: 4px; overflow: hidden; margin-bottom: 2rem; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e ${passRate}%, #ef4444 ${passRate}%); }
    table { width: 100%; border-collapse: collapse; background: #1a1b23; border-radius: 0.75rem; overflow: hidden; border: 1px solid #27272a; }
    th { background: #1f2028; padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
    td { padding: 0.6rem 1rem; border-top: 1px solid #27272a; font-size: 0.8rem; }
    tr:hover td { background: #1f2028; }
    .method { font-weight: 700; font-size: 0.7rem; padding: 2px 6px; border-radius: 3px; }
    .method-get { color: #22c55e; }
    .method-post { color: #eab308; }
    .method-put { color: #3b82f6; }
    .method-patch { color: #a855f7; }
    .method-delete { color: #ef4444; }
    .badge { font-size: 0.65rem; padding: 2px 8px; border-radius: 3px; font-weight: 600; }
    .badge-pass { background: rgba(34,197,94,0.15); color: #22c55e; }
    .badge-fail { background: rgba(239,68,68,0.15); color: #ef4444; }
    .footer { margin-top: 2rem; text-align: center; color: #52525b; font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(collectionName)}</h1>
    <p class="subtitle">Run Report • ${new Date().toLocaleString()} • ${totalIterations} iteration(s)</p>
    
    <div class="progress-bar"><div class="progress-fill"></div></div>
    
    <div class="summary">
      <div class="card"><div class="card-value">${results.length}</div><div class="card-label">Total Requests</div></div>
      <div class="card"><div class="card-value success">${passedCount}</div><div class="card-label">Passed</div></div>
      <div class="card"><div class="card-value error">${failedCount}</div><div class="card-label">Failed</div></div>
      <div class="card"><div class="card-value">${passRate}%</div><div class="card-label">Pass Rate</div></div>
      <div class="card"><div class="card-value">${avgTime}ms</div><div class="card-label">Avg Time</div></div>
      <div class="card"><div class="card-value">${totalTime}ms</div><div class="card-label">Total Time</div></div>
    </div>

    <table>
      <thead>
        <tr><th>#</th><th>Method</th><th>Name</th><th>URL</th><th>Status</th><th>Time</th><th>Result</th><th>Error</th></tr>
      </thead>
      <tbody>${resultRows}</tbody>
    </table>

    <p class="footer">Generated by Hantara API Client</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
