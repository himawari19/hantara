"use client";

import { useState, useRef } from "react";
import { useRequestStore } from "@/store/request-store";
import { useEnvironmentStore } from "@/store/environment-store";
import { Play, Square, BarChart3 } from "lucide-react";

interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  failCount: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  totalDuration: number;
  statusCodes: Record<number, number>;
  timings: number[];
}

export function LoadTestPanel() {
  const { method, url, headers, body, bodyType } = useRequestStore();
  const { interpolate } = useEnvironmentStore();
  const [concurrency, setConcurrency] = useState(10);
  const [totalRequests, setTotalRequests] = useState(100);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<LoadTestResult | null>(null);
  const abortRef = useRef(false);

  const runLoadTest = async () => {
    if (!url.trim()) return;

    setIsRunning(true);
    setProgress(0);
    setResult(null);
    abortRef.current = false;

    const resolvedUrl = interpolate(url);
    const activeHeaders: Record<string, string> = {};
    headers.filter((h) => h.enabled && h.key.trim()).forEach((h) => {
      activeHeaders[interpolate(h.key)] = interpolate(h.value);
    });

    const timings: number[] = [];
    const statusCodes: Record<number, number> = {};
    let successCount = 0;
    let failCount = 0;
    let completed = 0;

    const startTime = performance.now();

    // Run in batches of concurrency
    const batches = Math.ceil(totalRequests / concurrency);

    for (let batch = 0; batch < batches; batch++) {
      if (abortRef.current) break;

      const batchSize = Math.min(concurrency, totalRequests - batch * concurrency);
      const promises = Array.from({ length: batchSize }, async () => {
        if (abortRef.current) return;

        const reqStart = performance.now();
        try {
          const res = await fetch("/api/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method,
              url: resolvedUrl,
              headers: activeHeaders,
              body: bodyType !== "none" ? interpolate(body) : undefined,
            }),
          });

          const data = await res.json();
          const time = Math.round(performance.now() - reqStart);
          timings.push(time);

          const status = data.status || 0;
          statusCodes[status] = (statusCodes[status] || 0) + 1;

          if (status >= 200 && status < 400) successCount++;
          else failCount++;
        } catch {
          const time = Math.round(performance.now() - reqStart);
          timings.push(time);
          failCount++;
          statusCodes[0] = (statusCodes[0] || 0) + 1;
        }

        completed++;
        setProgress(Math.round((completed / totalRequests) * 100));
      });

      await Promise.all(promises);
    }

    const totalDuration = Math.round(performance.now() - startTime);

    // Calculate percentiles
    const sorted = [...timings].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    setResult({
      totalRequests: timings.length,
      successCount,
      failCount,
      avgTime: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
      minTime: sorted[0] || 0,
      maxTime: sorted[sorted.length - 1] || 0,
      p50,
      p95,
      p99,
      requestsPerSecond: Math.round((timings.length / totalDuration) * 1000 * 10) / 10,
      totalDuration,
      statusCodes,
      timings: sorted,
    });

    setIsRunning(false);
  };

  const stopTest = () => {
    abortRef.current = true;
    setIsRunning(false);
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Config */}
      <div className="flex flex-wrap items-center gap-4 border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Total Requests:</label>
          <input
            type="number"
            value={totalRequests}
            onChange={(e) => setTotalRequests(Math.max(1, Number(e.target.value)))}
            min={1}
            max={10000}
            className="w-24 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            aria-label="Total number of requests"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-secondary)]">Concurrency:</label>
          <input
            type="number"
            value={concurrency}
            onChange={(e) => setConcurrency(Math.max(1, Math.min(100, Number(e.target.value))))}
            min={1}
            max={100}
            className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            aria-label="Number of concurrent requests"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--bg-tertiary)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)]">
            {method} {url || "—"}
          </span>
        </div>

        {isRunning ? (
          <button
            type="button"
            onClick={stopTest}
            className="ml-auto flex items-center gap-1.5 rounded bg-[var(--error)] px-4 py-1.5 text-xs font-bold text-white"
          >
            <Square size={12} /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={runLoadTest}
            disabled={!url.trim()}
            className="ml-auto flex items-center gap-1.5 rounded bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            <Play size={12} /> Run Load Test
          </button>
        )}
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="border-b border-[var(--border)] px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Running...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex-1 overflow-auto p-4">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-4 gap-3">
            <StatCard label="Total" value={result.totalRequests.toString()} />
            <StatCard label="Success" value={result.successCount.toString()} color="text-[var(--success)]" />
            <StatCard label="Failed" value={result.failCount.toString()} color="text-[var(--error)]" />
            <StatCard label="RPS" value={result.requestsPerSecond.toString()} color="text-[var(--info)]" />
          </div>

          {/* Timing Stats */}
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-bold text-[var(--text-primary)]">Response Times</h4>
            <div className="grid grid-cols-6 gap-3">
              <StatCard label="Avg" value={`${result.avgTime}ms`} />
              <StatCard label="Min" value={`${result.minTime}ms`} color="text-[var(--success)]" />
              <StatCard label="Max" value={`${result.maxTime}ms`} color="text-[var(--error)]" />
              <StatCard label="P50" value={`${result.p50}ms`} />
              <StatCard label="P95" value={`${result.p95}ms`} color="text-[var(--warning)]" />
              <StatCard label="P99" value={`${result.p99}ms`} color="text-[var(--error)]" />
            </div>
          </div>

          {/* Status Codes */}
          <div className="mb-6">
            <h4 className="mb-2 text-xs font-bold text-[var(--text-primary)]">Status Codes</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.statusCodes).map(([code, count]) => (
                <div
                  key={code}
                  className={`rounded px-3 py-1.5 text-xs font-medium ${
                    Number(code) >= 200 && Number(code) < 300
                      ? "bg-green-900/20 text-[var(--success)]"
                      : Number(code) >= 400
                      ? "bg-red-900/20 text-[var(--error)]"
                      : "bg-yellow-900/20 text-[var(--warning)]"
                  }`}
                >
                  {code === "0" ? "Error" : code}: {count}
                </div>
              ))}
            </div>
          </div>

          {/* Response Time Distribution */}
          <div>
            <h4 className="mb-2 text-xs font-bold text-[var(--text-primary)]">Response Time Distribution</h4>
            <ResponseTimeChart timings={result.timings} />
          </div>

          {/* Duration */}
          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            Total duration: {(result.totalDuration / 1000).toFixed(2)}s
          </p>
        </div>
      )}

      {!result && !isRunning && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <BarChart3 size={40} className="text-[var(--text-secondary)] opacity-30" />
            <p className="text-sm text-[var(--text-secondary)]">
              Configure and run a load test to see performance metrics
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-center">
      <div className={`text-lg font-bold ${color || "text-[var(--text-primary)]"}`}>{value}</div>
      <div className="text-[10px] text-[var(--text-secondary)]">{label}</div>
    </div>
  );
}

function ResponseTimeChart({ timings }: { timings: number[] }) {
  if (timings.length === 0) return null;

  // Create histogram buckets
  const maxTime = timings[timings.length - 1] || 1;
  const bucketCount = Math.min(20, timings.length);
  const bucketSize = Math.ceil(maxTime / bucketCount);
  const buckets: { range: string; count: number }[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const min = i * bucketSize;
    const max = (i + 1) * bucketSize;
    const count = timings.filter((t) => t >= min && t < max).length;
    buckets.push({ range: `${min}-${max}ms`, count });
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="flex items-end gap-0.5" style={{ height: "100px" }}>
      {buckets.map((bucket, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t bg-[var(--accent)] transition-all hover:bg-[var(--accent-hover)]"
            style={{ height: `${Math.max((bucket.count / maxCount) * 80, 1)}px` }}
            title={`${bucket.range}: ${bucket.count} requests`}
          />
          {i % Math.ceil(bucketCount / 5) === 0 && (
            <span className="text-[7px] text-[var(--text-secondary)]">
              {bucket.range.split("-")[0]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
