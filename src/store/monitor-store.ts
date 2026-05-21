import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface MonitorCheck {
  id: string;
  timestamp: number;
  status: number;
  time: number;
  success: boolean;
  error?: string;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body?: string;
  intervalMs: number; // check interval in ms
  isActive: boolean;
  expectedStatus: number;
  maxResponseTime: number; // alert if response time exceeds this
  checks: MonitorCheck[];
  lastCheck?: MonitorCheck;
  createdAt: number;
}

interface MonitorState {
  monitors: Monitor[];
  addMonitor: (monitor: Partial<Monitor>) => void;
  removeMonitor: (id: string) => void;
  updateMonitor: (id: string, data: Partial<Monitor>) => void;
  toggleMonitor: (id: string) => void;
  addCheck: (monitorId: string, check: MonitorCheck) => void;
  clearChecks: (monitorId: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      monitors: [],

      addMonitor: (data) => {
        const monitor: Monitor = {
          id: generateId(),
          name: data.name || "New Monitor",
          url: data.url || "",
          method: data.method || "GET",
          headers: data.headers || {},
          body: data.body,
          intervalMs: data.intervalMs || 60000, // default 1 minute
          isActive: true,
          expectedStatus: data.expectedStatus || 200,
          maxResponseTime: data.maxResponseTime || 5000,
          checks: [],
          createdAt: Date.now(),
        };
        set((state) => ({ monitors: [...state.monitors, monitor] }));
      },

      removeMonitor: (id) => {
        set((state) => ({ monitors: state.monitors.filter((m) => m.id !== id) }));
      },

      updateMonitor: (id, data) => {
        set((state) => ({
          monitors: state.monitors.map((m) => (m.id === id ? { ...m, ...data } : m)),
        }));
      },

      toggleMonitor: (id) => {
        set((state) => ({
          monitors: state.monitors.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
        }));
      },

      addCheck: (monitorId, check) => {
        set((state) => ({
          monitors: state.monitors.map((m) => {
            if (m.id !== monitorId) return m;
            const checks = [check, ...m.checks].slice(0, 100); // Keep last 100
            return { ...m, checks, lastCheck: check };
          }),
        }));
      },

      clearChecks: (monitorId) => {
        set((state) => ({
          monitors: state.monitors.map((m) =>
            m.id === monitorId ? { ...m, checks: [], lastCheck: undefined } : m
          ),
        }));
      },
    }),
    { name: "hantara-monitors", storage: idbStorage }
  )
);
