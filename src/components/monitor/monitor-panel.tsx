"use client";

import { useState, useEffect, useRef } from "react";
import { useMonitorStore, Monitor, MonitorCheck } from "@/store/monitor-store";
import { Plus, Trash2, Power, Activity, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

export function MonitorPanel() {
  const { monitors, addMonitor } = useMonitorStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedMonitor = monitors.find((m) => m.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Monitor List */}
      <div className="w-64 border-r border-[var(--border)] flex flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">Monitors ({monitors.length})</span>
          <button
            type="button"
            onClick={() => addMonitor({ name: "New Monitor" })}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Add monitor"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {monitors.map((monitor) => (
            <MonitorListItem
              key={monitor.id}
              monitor={monitor}
              isSelected={selectedId === monitor.id}
              onSelect={() => setSelectedId(monitor.id)}
            />
          ))}
          {monitors.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-4">
              <Activity size={24} className="text-[var(--text-secondary)] opacity-30" />
              <p className="text-center text-xs text-[var(--text-secondary)]">
                No monitors yet. Create one to start monitoring your APIs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monitor Detail */}
      {selectedMonitor ? (
        <MonitorDetail monitor={selectedMonitor} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-secondary)]">Select a monitor to view details</p>
        </div>
      )}
    </div>
  );
}

function MonitorListItem({ monitor, isSelected, onSelect }: { monitor: Monitor; isSelected: boolean; onSelect: () => void }) {
  const { removeMonitor, toggleMonitor } = useMonitorStore();
  const isUp = monitor.lastCheck?.success ?? true;

  return (
    <div
      className={`group flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 cursor-pointer ${
        isSelected ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
      }`}
      onClick={onSelect}
    >
      <div className={`h-2 w-2 rounded-full ${!monitor.isActive ? "bg-[var(--text-secondary)]" : isUp ? "bg-[var(--success)]" : "bg-[var(--error)]"}`} />
      <div className="flex flex-1 flex-col min-w-0">
        <span className="truncate text-xs text-[var(--text-primary)]">{monitor.name}</span>
        <span className="truncate text-[10px] text-[var(--text-secondary)]">{monitor.url || "No URL"}</span>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleMonitor(monitor.id); }}
        className={`rounded p-0.5 opacity-0 group-hover:opacity-100 ${monitor.isActive ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}`}
        aria-label="Toggle monitor"
      >
        <Power size={12} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); removeMonitor(monitor.id); }}
        className="rounded p-0.5 text-[var(--text-secondary)] opacity-0 hover:text-[var(--error)] group-hover:opacity-100"
        aria-label="Delete monitor"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function MonitorDetail({ monitor }: { monitor: Monitor }) {
  const { updateMonitor, addCheck, clearChecks } = useMonitorStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Auto-check based on interval
  useEffect(() => {
    if (monitor.isActive && monitor.url) {
      intervalRef.current = setInterval(() => {
        runCheck();
      }, monitor.intervalMs);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [monitor.isActive, monitor.url, monitor.intervalMs]);

  const runCheck = async () => {
    if (!monitor.url || isChecking) return;
    setIsChecking(true);

    const startTime = performance.now();
    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: monitor.method,
          url: monitor.url,
          headers: monitor.headers,
          body: monitor.body,
        }),
      });

      const data = await res.json();
      const time = Math.round(performance.now() - startTime);
      const success = data.status === monitor.expectedStatus && time <= monitor.maxResponseTime;

      const check: MonitorCheck = {
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        status: data.status,
        time,
        success,
      };

      addCheck(monitor.id, check);

      // Browser notification if failed
      if (!success && Notification.permission === "granted") {
        new Notification(`⚠️ ${monitor.name} is down`, {
          body: `Status: ${data.status}, Time: ${time}ms`,
        });
      }
    } catch (err: any) {
      const time = Math.round(performance.now() - startTime);
      addCheck(monitor.id, {
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
        status: 0,
        time,
        success: false,
        error: err.message,
      });
    }
    setIsChecking(false);
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  };

  const uptime = monitor.checks.length > 0
    ? Math.round((monitor.checks.filter((c) => c.success).length / monitor.checks.length) * 100)
    : 100;

  const avgTime = monitor.checks.length > 0
    ? Math.round(monitor.checks.reduce((a, c) => a + c.time, 0) / monitor.checks.length)
    : 0;

  const intervals = [
    { label: "30s", value: 30000 },
    { label: "1m", value: 60000 },
    { label: "5m", value: 300000 },
    { label: "15m", value: 900000 },
    { label: "30m", value: 1800000 },
    { label: "1h", value: 3600000 },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Config */}
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={monitor.name}
              onChange={(e) => updateMonitor(monitor.id, { name: e.target.value })}
              className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] outline-none"
              placeholder="Monitor name"
            />
            <select
              value={monitor.method}
              onChange={(e) => updateMonitor(monitor.id, { method: e.target.value as any })}
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none"
              aria-label="HTTP method"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <input
            type="text"
            value={monitor.url}
            onChange={(e) => updateMonitor(monitor.id, { url: e.target.value })}
            placeholder="https://api.example.com/health"
            className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Interval:</label>
              <div className="flex gap-1">
                {intervals.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => updateMonitor(monitor.id, { intervalMs: i.value })}
                    className={`rounded px-2 py-0.5 text-[10px] ${
                      monitor.intervalMs === i.value
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Expected:</label>
              <input
                type="number"
                value={monitor.expectedStatus}
                onChange={(e) => updateMonitor(monitor.id, { expectedStatus: Number(e.target.value) })}
                className="w-16 rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] outline-none"
                aria-label="Expected status code"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[var(--text-secondary)]">Max time:</label>
              <input
                type="number"
                value={monitor.maxResponseTime}
                onChange={(e) => updateMonitor(monitor.id, { maxResponseTime: Number(e.target.value) })}
                className="w-20 rounded bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-primary)] outline-none"
                aria-label="Maximum response time in ms"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">ms</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runCheck}
              disabled={isChecking || !monitor.url}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} /> Check Now
            </button>
            <button
              type="button"
              onClick={requestNotificationPermission}
              className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Enable Notifications
            </button>
            <button
              type="button"
              onClick={() => clearChecks(monitor.id)}
              className="rounded border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--error)]"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 border-b border-[var(--border)] p-4">
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
          <div className={`text-xl font-bold ${uptime >= 99 ? "text-[var(--success)]" : uptime >= 95 ? "text-[var(--warning)]" : "text-[var(--error)]"}`}>
            {uptime}%
          </div>
          <div className="text-[10px] text-[var(--text-secondary)]">Uptime</div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--text-primary)]">{avgTime}ms</div>
          <div className="text-[10px] text-[var(--text-secondary)]">Avg Response</div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--success)]">{monitor.checks.filter((c) => c.success).length}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">Successful</div>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 text-center">
          <div className="text-xl font-bold text-[var(--error)]">{monitor.checks.filter((c) => !c.success).length}</div>
          <div className="text-[10px] text-[var(--text-secondary)]">Failed</div>
        </div>
      </div>

      {/* Response Time Graph */}
      {monitor.checks.length > 0 && (
        <div className="border-b border-[var(--border)] p-4">
          <h4 className="mb-2 text-xs font-medium text-[var(--text-primary)]">Response Time (last {monitor.checks.length} checks)</h4>
          <UptimeGraph checks={monitor.checks} maxTime={monitor.maxResponseTime} />
        </div>
      )}

      {/* Check History */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-2 text-xs font-medium text-[var(--text-primary)]">History</div>
        {monitor.checks.length === 0 ? (
          <p className="px-4 py-4 text-center text-xs text-[var(--text-secondary)]">No checks yet</p>
        ) : (
          monitor.checks.slice(0, 50).map((check) => (
            <div key={check.id} className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-1.5">
              {check.success ? (
                <CheckCircle size={12} className="text-[var(--success)]" />
              ) : (
                <XCircle size={12} className="text-[var(--error)]" />
              )}
              <span className={`text-xs font-bold ${check.success ? "text-[var(--success)]" : "text-[var(--error)]"}`}>
                {check.status || "ERR"}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{check.time}ms</span>
              {check.error && <span className="text-[10px] text-[var(--error)]">{check.error}</span>}
              <span className="ml-auto text-[10px] text-[var(--text-secondary)]">
                {new Date(check.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function UptimeGraph({ checks, maxTime }: { checks: MonitorCheck[]; maxTime: number }) {
  const reversed = [...checks].reverse().slice(-30);
  const maxVal = Math.max(...reversed.map((c) => c.time), maxTime);

  return (
    <div className="flex items-end gap-0.5" style={{ height: "60px" }}>
      {reversed.map((check, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t transition-all ${check.success ? "bg-[var(--success)]" : "bg-[var(--error)]"}`}
          style={{ height: `${Math.max((check.time / maxVal) * 55, 2)}px` }}
          title={`${check.time}ms - ${new Date(check.timestamp).toLocaleTimeString()}`}
        />
      ))}
      {/* Threshold line */}
      <div
        className="absolute left-0 right-0 border-t border-dashed border-[var(--warning)]"
        style={{ bottom: `${(maxTime / maxVal) * 55}px` }}
      />
    </div>
  );
}
