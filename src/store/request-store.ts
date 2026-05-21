import { create } from "zustand";
import { useEnvironmentStore } from "./environment-store";
import { useCollectionStore } from "./collection-store";
import { useResponseStore } from "./response-store";
import { executePreRequestScript, executeTestScriptAsync } from "@/lib/script-executor";
import type { ResponseData, TestResult } from "./response-store";

export type { ResponseData, TestResult } from "./response-store";

export interface HistoryItem {
  id: string;
  method: string;
  url: string;
  status: number;
  time: number;
  timestamp: number;
  size: number;
}

interface RequestState {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "graphql";
  formData: { key: string; value: string; type: "text" | "file"; enabled: boolean }[];
  description: string;

  // Scripts
  preScript: string;
  testScript: string;
  scriptLogs: string[];
  testResults: TestResult[];

  // Response — kept for backward compat, delegates to response-store
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;

  // History
  history: HistoryItem[];

  // Console
  consoleLogs: { type: "info" | "warn" | "error" | "log"; message: string; timestamp: number }[];

  // Actions
  setMethod: (method: RequestState["method"]) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: RequestState["headers"]) => void;
  setBody: (body: string) => void;
  setBodyType: (bodyType: RequestState["bodyType"]) => void;
  setFormData: (formData: RequestState["formData"]) => void;
  setDescription: (description: string) => void;
  setPreScript: (script: string) => void;
  setTestScript: (script: string) => void;
  setResponse: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendRequest: () => Promise<void>;
  cancelRequest: () => void;
  clearHistory: () => void;
  clearScriptLogs: () => void;
  addConsoleLogs: (log: { type: "info" | "warn" | "error" | "log"; message: string }) => void;
  clearConsoleLogs: () => void;
}

let abortController: AbortController | null = null;
let isSending = false; // Deduplication guard

function generateId(): string {
  return crypto.randomUUID();
}

export const useRequestStore = create<RequestState>((set, get) => ({
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  body: "",
  bodyType: "none",
  formData: [{ key: "", value: "", type: "text", enabled: true }],
  description: "",
  preScript: "",
  testScript: "",
  scriptLogs: [],
  testResults: [],
  response: null,
  isLoading: false,
  error: null,
  history: [],
  consoleLogs: [],

  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setHeaders: (headers) => set({ headers }),
  setBody: (body) => set({ body }),
  setBodyType: (bodyType) => set({ bodyType }),
  setFormData: (formData) => set({ formData }),
  setDescription: (description) => set({ description }),
  setPreScript: (script) => set({ preScript: script }),
  setTestScript: (script) => set({ testScript: script }),
  setResponse: (response) => {
    set({ response });
    useResponseStore.getState().setResponse(response);
  },
  setLoading: (loading) => {
    set({ isLoading: loading });
    useResponseStore.getState().setLoading(loading);
  },
  setError: (error) => {
    set({ error });
    useResponseStore.getState().setError(error);
  },
  clearHistory: () => set({ history: [] }),
  clearScriptLogs: () => {
    set({ scriptLogs: [], testResults: [] });
    useResponseStore.getState().clearScriptLogs();
  },
  addConsoleLogs: (log) =>
    set((state) => ({
      consoleLogs: [...state.consoleLogs, { ...log, timestamp: Date.now() }].slice(-500),
    })),
  clearConsoleLogs: () => set({ consoleLogs: [] }),

  cancelRequest: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
      set({ isLoading: false, error: "Request cancelled" });
      useResponseStore.getState().setLoading(false);
      useResponseStore.getState().setError("Request cancelled");
    }
  },

  sendRequest: async () => {
    // Deduplication: prevent double-send
    if (isSending) return;
    isSending = true;

    try {
      const { method, url, headers, body, bodyType, formData, preScript, testScript } = get();
      const interpolate = useEnvironmentStore.getState().interpolate;
      const { getInheritedAuth, getInheritedHeaders, activeRequestId } = useCollectionStore.getState();

      if (!url.trim()) {
        set({ error: "URL is required" });
        return;
      }

      let resolvedUrl = interpolate(url);
      const resolvedBody = interpolate(body);

      // Auto-prepend https:// if no protocol specified
      if (resolvedUrl && !resolvedUrl.match(/^https?:\/\//i)) {
        resolvedUrl = `https://${resolvedUrl}`;
      }

      set({ isLoading: true, error: null, response: null, scriptLogs: [], testResults: [] });
      useResponseStore.getState().setLoading(true);
      useResponseStore.getState().setError(null);
      useResponseStore.getState().setResponse(null);
      useResponseStore.getState().clearScriptLogs();

      abortController = new AbortController();

      // Execute pre-request script via Web Worker
      if (preScript.trim()) {
        try {
          const envStore = useEnvironmentStore.getState();
          const variables: Record<string, string> = {};
          const globals: Record<string, string> = {};
          // Collect current variables
          const activeEnv = envStore.environments.find(e => e.id === envStore.activeEnvironmentId);
          if (activeEnv) {
            activeEnv.variables.forEach((v: any) => { if (v.key) variables[v.key] = v.currentValue || v.initialValue || ""; });
          }
          envStore.globals.forEach((g: any) => { if (g.key) globals[g.key] = g.currentValue || g.initialValue || ""; });

          const result = await executePreRequestScript(preScript, variables, globals);

          if (result.logs.length > 0) set({ scriptLogs: result.logs });
          // Apply variable updates back to store
          result.variableUpdates.forEach(({ key, value }) => envStore.setVariable(key, value));
          result.globalUpdates.forEach(({ key, value }) => envStore.setGlobalVariable(key, value));
        } catch (err: any) {
          set((state) => ({ scriptLogs: [...state.scriptLogs, `[ERROR] Pre-request: ${err.message}`] }));
        }
      }

      const startTime = performance.now();

      try {
        // Build headers: inherited (collection/folder) + request-level
        const activeHeaders: Record<string, string> = {};

        if (activeRequestId) {
          const inherited = getInheritedHeaders(activeRequestId);
          inherited.forEach((h) => {
            activeHeaders[interpolate(h.key)] = interpolate(h.value);
          });
        }

        if (activeRequestId) {
          const inheritedAuth = getInheritedAuth(activeRequestId);
          if (inheritedAuth) {
            if (inheritedAuth.type === "bearer" && inheritedAuth.config.token) {
              activeHeaders["Authorization"] = `Bearer ${interpolate(inheritedAuth.config.token)}`;
            } else if (inheritedAuth.type === "basic" && inheritedAuth.config.username) {
              const encoded = btoa(`${interpolate(inheritedAuth.config.username)}:${interpolate(inheritedAuth.config.password || "")}`);
              activeHeaders["Authorization"] = `Basic ${encoded}`;
            } else if (inheritedAuth.type === "api-key" && inheritedAuth.config.keyName) {
              activeHeaders[interpolate(inheritedAuth.config.keyName)] = interpolate(inheritedAuth.config.keyValue || "");
            }
          }
        }

        headers
          .filter((h) => h.enabled && h.key.trim())
          .forEach((h) => {
            activeHeaders[interpolate(h.key)] = interpolate(h.value);
          });

        let requestBody: string | undefined = undefined;
        if (bodyType === "json" || bodyType === "raw" || bodyType === "graphql") {
          requestBody = resolvedBody;
        } else if (bodyType === "form-data") {
          const formObj: Record<string, string> = {};
          formData.filter((f) => f.enabled && f.key.trim()).forEach((f) => {
            formObj[interpolate(f.key)] = interpolate(f.value);
          });
          requestBody = JSON.stringify(formObj);
        } else if (bodyType === "x-www-form-urlencoded") {
          const params = new URLSearchParams();
          formData.filter((f) => f.enabled && f.key.trim()).forEach((f) => {
            params.append(interpolate(f.key), interpolate(f.value));
          });
          requestBody = params.toString();
          if (!activeHeaders["Content-Type"]) {
            activeHeaders["Content-Type"] = "application/x-www-form-urlencoded";
          }
        }

        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method,
            url: resolvedUrl,
            headers: activeHeaders,
            body: bodyType !== "none" ? requestBody : undefined,
          }),
          signal: abortController.signal,
        });

        const data = await res.json();
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);

        const cookies: ResponseData["cookies"] = [];
        const setCookieHeader = data.headers?.["set-cookie"] || data.headers?.["Set-Cookie"];
        if (setCookieHeader) {
          const cookieStrs = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
          cookieStrs.forEach((c: string) => {
            const parts = c.split(";");
            const [nameValue] = parts;
            if (nameValue) {
              const [name, ...valueParts] = nameValue.split("=");
              cookies.push({ name: name?.trim() || "", value: valueParts.join("=").trim(), domain: "", path: "/" });
            }
          });
        }

        const responseData: ResponseData = {
          status: data.status,
          statusText: data.statusText,
          headers: data.headers || {},
          body: typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2),
          time: responseTime,
          size: new Blob([typeof data.body === "string" ? data.body : JSON.stringify(data.body)]).size,
          cookies,
        };

        // Execute test script via Web Worker
        let testResults: TestResult[] = [];
        let testLogs: string[] = [];
        if (testScript.trim()) {
          try {
            const envStore = useEnvironmentStore.getState();
            const variables: Record<string, string> = {};
            const globals: Record<string, string> = {};
            const activeEnv = envStore.environments.find(e => e.id === envStore.activeEnvironmentId);
            if (activeEnv) {
              activeEnv.variables.forEach((v: any) => { if (v.key) variables[v.key] = v.currentValue || v.initialValue || ""; });
            }
            envStore.globals.forEach((g: any) => { if (g.key) globals[g.key] = g.currentValue || g.initialValue || ""; });

            const result = await executeTestScriptAsync(testScript, responseData, variables, globals);
            testResults = result.testResults;
            testLogs = result.logs;
            result.variableUpdates.forEach(({ key, value }) => envStore.setVariable(key, value));
            result.globalUpdates.forEach(({ key, value }) => envStore.setGlobalVariable(key, value));
          } catch (err: any) {
            testLogs = [`[ERROR] Test script: ${err.message}`];
          }
        }

        set((state) => ({
          response: responseData,
          isLoading: false,
          testResults,
          scriptLogs: [...state.scriptLogs, ...testLogs],
          history: [
            { id: generateId(), method, url: resolvedUrl, status: data.status, time: responseTime, timestamp: Date.now(), size: responseData.size },
            ...state.history.slice(0, 99),
          ],
          consoleLogs: [
            ...state.consoleLogs,
            { type: "info" as const, message: `${method} ${resolvedUrl} → ${data.status} (${responseTime}ms)`, timestamp: Date.now() },
          ],
        }));

        // Sync to response-store
        useResponseStore.getState().setResponse(responseData);
        useResponseStore.getState().setLoading(false);
        useResponseStore.getState().setTestResults(testResults);
        useResponseStore.getState().appendScriptLogs(testLogs);
      } catch (err: any) {
        if (err.name === "AbortError") {
          set({ error: "Request cancelled", isLoading: false });
          useResponseStore.getState().setError("Request cancelled");
          useResponseStore.getState().setLoading(false);
        } else {
          set({
            error: err.message || "Request failed",
            isLoading: false,
            consoleLogs: [...get().consoleLogs, { type: "error" as const, message: `Error: ${err.message}`, timestamp: Date.now() }],
          });
          useResponseStore.getState().setError(err.message || "Request failed");
          useResponseStore.getState().setLoading(false);
        }
      } finally {
        abortController = null;
      }
    } finally {
      isSending = false;
    }
  },
}));
