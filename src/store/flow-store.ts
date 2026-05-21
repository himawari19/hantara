import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";
import { useEnvironmentStore } from "./environment-store";
import { useCookieStore } from "./cookie-store";
import { runScript, ScriptContext } from "@/lib/script-runner";

export interface FlowStep {
  id: string;
  requestId: string;
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: string;
  preScript: string;
  testScript: string;
}

export interface FlowRunResult {
  stepId: string;
  name: string;
  method: string;
  url: string;
  status: number;
  time: number;
  passed: boolean;
  testResults: { name: string; passed: boolean; error?: string }[];
  error?: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  delayBetweenRequests: number;
  createdAt: number;
}

export interface FlowRun {
  id: string;
  flowId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  results: FlowRunResult[];
  startedAt: number;
  completedAt?: number;
}

interface FlowState {
  flows: Flow[];
  currentRun: FlowRun | null;
  isRunning: boolean;
  runHistory: FlowRun[];

  // CRUD
  addFlow: (name: string) => void;
  removeFlow: (id: string) => void;
  updateFlow: (id: string, data: Partial<Flow>) => void;
  addStep: (flowId: string, step: FlowStep) => void;
  removeStep: (flowId: string, stepId: string) => void;
  reorderSteps: (flowId: string, steps: FlowStep[]) => void;

  // Runner
  runFlow: (flowId: string) => Promise<void>;
  cancelRun: () => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

let cancelFlag = false;

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      flows: [],
      currentRun: null,
      isRunning: false,
      runHistory: [],

      addFlow: (name) => {
        const flow: Flow = {
          id: generateId(),
          name,
          description: "",
          steps: [],
          delayBetweenRequests: 0,
          createdAt: Date.now(),
        };
        set((state) => ({ flows: [...state.flows, flow] }));
      },

      removeFlow: (id) => {
        set((state) => ({ flows: state.flows.filter((f) => f.id !== id) }));
      },

      updateFlow: (id, data) => {
        set((state) => ({
          flows: state.flows.map((f) => (f.id === id ? { ...f, ...data } : f)),
        }));
      },

      addStep: (flowId, step) => {
        set((state) => ({
          flows: state.flows.map((f) =>
            f.id === flowId ? { ...f, steps: [...f.steps, step] } : f
          ),
        }));
      },

      removeStep: (flowId, stepId) => {
        set((state) => ({
          flows: state.flows.map((f) =>
            f.id === flowId
              ? { ...f, steps: f.steps.filter((s) => s.id !== stepId) }
              : f
          ),
        }));
      },

      reorderSteps: (flowId, steps) => {
        set((state) => ({
          flows: state.flows.map((f) => (f.id === flowId ? { ...f, steps } : f)),
        }));
      },

      cancelRun: () => {
        cancelFlag = true;
        set((state) => ({
          isRunning: false,
          currentRun: state.currentRun
            ? { ...state.currentRun, status: "cancelled", completedAt: Date.now() }
            : null,
        }));
      },

      runFlow: async (flowId) => {
        const { flows } = get();
        const flow = flows.find((f) => f.id === flowId);
        if (!flow || flow.steps.length === 0) return;

        cancelFlag = false;
        const interpolate = useEnvironmentStore.getState().interpolate;
        const cookieStore = useCookieStore.getState();

        const run: FlowRun = {
          id: generateId(),
          flowId,
          status: "running",
          results: [],
          startedAt: Date.now(),
        };

        set({ currentRun: run, isRunning: true });

        const results: FlowRunResult[] = [];
        let allPassed = true;

        for (const step of flow.steps) {
          if (cancelFlag) break;

          const resolvedUrl = interpolate(step.url);
          const resolvedBody = interpolate(step.body);

          const activeHeaders: Record<string, string> = {};
          step.headers
            .filter((h) => h.enabled && h.key.trim())
            .forEach((h) => {
              activeHeaders[interpolate(h.key)] = interpolate(h.value);
            });

          // Get cookies
          let domainCookies: { name: string; value: string }[] = [];
          try {
            const urlObj = new URL(resolvedUrl);
            domainCookies = cookieStore.getCookiesForDomain(urlObj.hostname);
          } catch {
            // ignore
          }

          // Run pre-script
          if (step.preScript.trim()) {
            const ctx: ScriptContext = {
              request: { method: step.method, url: resolvedUrl, headers: activeHeaders, body: resolvedBody },
              variables: {},
              collectionVariables: {},
              globals: {},
            };
            runScript(step.preScript, ctx);
          }

          try {
            const startTime = performance.now();
            const res = await fetch("/api/proxy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                method: step.method,
                url: resolvedUrl,
                headers: activeHeaders,
                body: step.bodyType !== "none" ? resolvedBody : undefined,
                cookies: domainCookies,
              }),
            });

            const data = await res.json();
            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Run test script
            let testResults: { name: string; passed: boolean; error?: string }[] = [];
            if (step.testScript.trim()) {
              const testCtx: ScriptContext = {
                request: { method: step.method, url: resolvedUrl, headers: activeHeaders, body: resolvedBody },
                response: {
                  status: data.status,
                  statusText: data.statusText,
                  headers: data.headers,
                  body: typeof data.body === "string" ? data.body : JSON.stringify(data.body),
                  time: responseTime,
                },
                variables: {},
                collectionVariables: {},
                globals: {},
              };
              const scriptResult = runScript(step.testScript, testCtx);
              testResults = scriptResult.testResults;
            }

            const stepPassed = testResults.length === 0 || testResults.every((t) => t.passed);
            if (!stepPassed) allPassed = false;

            results.push({
              stepId: step.id,
              name: step.name,
              method: step.method,
              url: resolvedUrl,
              status: data.status,
              time: responseTime,
              passed: stepPassed,
              testResults,
            });

            // Store cookies
            if (data.setCookies) {
              for (const cookie of data.setCookies) {
                cookieStore.addCookie({ domain: cookie.domain, name: cookie.name, value: cookie.value, path: cookie.path, expires: cookie.expires });
              }
            }
          } catch (err: any) {
            allPassed = false;
            results.push({
              stepId: step.id,
              name: step.name,
              method: step.method,
              url: resolvedUrl,
              status: 0,
              time: 0,
              passed: false,
              testResults: [],
              error: err.message,
            });
          }

          // Update current run progress
          set({ currentRun: { ...run, results: [...results] } });

          // Delay between requests
          if (flow.delayBetweenRequests > 0 && !cancelFlag) {
            await new Promise((resolve) => setTimeout(resolve, flow.delayBetweenRequests));
          }
        }

        const completedRun: FlowRun = {
          ...run,
          results,
          status: cancelFlag ? "cancelled" : allPassed ? "completed" : "failed",
          completedAt: Date.now(),
        };

        set((state) => ({
          currentRun: completedRun,
          isRunning: false,
          runHistory: [completedRun, ...state.runHistory.slice(0, 49)],
        }));
      },
    }),
    {
      name: "hantara-flows",
      storage: idbStorage,
    }
  )
);
