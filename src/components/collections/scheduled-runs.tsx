"use client";

import { useState } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { X, Plus, Trash2, Clock, Play, Pause, Calendar } from "lucide-react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScheduledRun {
  id: string;
  collectionId: string;
  collectionName: string;
  cron: string;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
  notifyOnFailure: boolean;
}

interface ScheduleState {
  schedules: ScheduledRun[];
  addSchedule: (schedule: Omit<ScheduledRun, "id" | "lastRun" | "nextRun">) => void;
  removeSchedule: (id: string) => void;
  toggleSchedule: (id: string) => void;
  updateLastRun: (id: string) => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      schedules: [],

      addSchedule: (schedule) => {
        const newSchedule: ScheduledRun = {
          ...schedule,
          id: crypto.randomUUID(),
          lastRun: null,
          nextRun: calculateNextRun(schedule.cron),
        };
        set((state) => ({ schedules: [...state.schedules, newSchedule] }));
      },

      removeSchedule: (id) => {
        set((state) => ({ schedules: state.schedules.filter((s) => s.id !== id) }));
      },

      toggleSchedule: (id) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        }));
      },

      updateLastRun: (id) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, lastRun: Date.now(), nextRun: calculateNextRun(s.cron) } : s
          ),
        }));
      },
    }),
    { name: "hantara-schedules" }
  )
);

interface ScheduledRunsProps {
  onClose: () => void;
}

const CRON_PRESETS = [
  { label: "Every 5 minutes", value: "*/5 * * * *" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Weekly (Monday 9 AM)", value: "0 9 * * 1" },
];

export function ScheduledRuns({ onClose }: ScheduledRunsProps) {
  const { collections } = useCollectionStore();
  const { schedules, addSchedule, removeSchedule, toggleSchedule } = useScheduleStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newCollectionId, setNewCollectionId] = useState(collections[0]?.id || "");
  const [newCron, setNewCron] = useState("0 * * * *");
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);

  const handleAdd = () => {
    const collection = collections.find((c) => c.id === newCollectionId);
    if (!collection) return;
    addSchedule({
      collectionId: newCollectionId,
      collectionName: collection.name,
      cron: newCron,
      enabled: true,
      notifyOnFailure,
    });
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Scheduled Runs</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div className="border-b border-[var(--border)] px-5 py-2">
          <p className="text-[10px] text-[var(--text-secondary)]">
            Schedule collections to run automatically at specified intervals. Runs execute in the browser when the app is open.
            For server-side scheduling, export as GitHub Actions workflow.
          </p>
        </div>

        {/* Schedules List */}
        <div className="max-h-[300px] overflow-auto">
          {schedules.length === 0 && !showAdd && (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock size={24} className="mb-2 text-[var(--text-secondary)] opacity-30" />
              <span className="text-xs text-[var(--text-secondary)]">No scheduled runs</span>
            </div>
          )}

          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3">
              <button
                type="button"
                onClick={() => toggleSchedule(schedule.id)}
                className={`rounded p-1 ${schedule.enabled ? "text-[var(--success)]" : "text-[var(--text-secondary)]"}`}
                aria-label={schedule.enabled ? "Pause schedule" : "Enable schedule"}
              >
                {schedule.enabled ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <div className="flex-1">
                <div className="text-xs font-medium text-[var(--text-primary)]">{schedule.collectionName}</div>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                  <span className="font-mono">{schedule.cron}</span>
                  {schedule.lastRun && (
                    <span>• Last: {new Date(schedule.lastRun).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[9px] ${schedule.enabled ? "bg-green-900/20 text-[var(--success)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`}>
                {schedule.enabled ? "Active" : "Paused"}
              </span>
              <button
                type="button"
                onClick={() => removeSchedule(schedule.id)}
                className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label="Delete schedule"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add New */}
        {showAdd ? (
          <div className="border-t border-[var(--border)] px-5 py-3">
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[10px] text-[var(--text-secondary)]">Collection</label>
                  <select
                    value={newCollectionId}
                    onChange={(e) => setNewCollectionId(e.target.value)}
                    className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                    aria-label="Select collection"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-[10px] text-[var(--text-secondary)]">Schedule</label>
                  <select
                    value={newCron}
                    onChange={(e) => setNewCron(e.target.value)}
                    className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none"
                    aria-label="Select schedule"
                  >
                    {CRON_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                <input type="checkbox" checked={notifyOnFailure} onChange={(e) => setNotifyOnFailure(e.target.checked)} className="rounded" />
                Notify on failure (browser notification)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
                >
                  Add Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-[var(--border)] px-5 py-3">
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
            >
              <Plus size={12} /> Add Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateNextRun(cron: string): number {
  // Simple next-run calculation based on cron pattern
  const now = Date.now();
  const parts = cron.split(" ");
  if (parts.length !== 5) return now + 3600000;

  const minute = parts[0];
  if (minute.startsWith("*/")) {
    const interval = parseInt(minute.slice(2)) * 60000;
    return now + interval;
  }

  // Default: next hour
  return now + 3600000;
}
