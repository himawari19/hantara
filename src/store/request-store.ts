import { create } from "zustand";
import { useEnvironmentStore } from "./environment-store";

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  cookies: { name: string; value: string; domain: string; path: string }[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

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

  // Response
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
  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearHistory: () => set({ history: [] }),
  clearScriptLogs: () => set({ scriptLogs: [], testResults: [] }),
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
    }
  },

  sendRequest: async () => {
    const { method, url, headers, body, bodyType, formData, preScript, testScript } = get();
    const interpolate = useEnvironmentStore.getState().interpolate;

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

    abortController = new AbortController();

    // Execute pre-request script
    if (preScript.trim()) {
      try {
        const logs: string[] = [];
        const envStore = useEnvironmentStore.getState();
        const fn = new Function("pm", "console", preScript);
        fn(
          {
            variables: {
              set: (key: string, value: string) => envStore.setVariable(key, value),
              get: (key: string) => envStore.getVariable(key) || "",
            },
            globals: {
              set: (key: string, value: string) => envStore.setGlobalVariable(key, value),
              get: (key: string) => envStore.getGlobalVariable(key) || "",
            },
            environment: {
              set: (key: string, value: string) => envStore.setVariable(key, value),
              get: (key: string) => envStore.getVariable(key) || "",
            },
            request: { addHeader: () => {} },
          },
          { log: (msg: string) => logs.push(String(msg)) }
        );
        if (logs.length > 0) set({ scriptLogs: logs });
      } catch (err: any) {
        set((state) => ({ scriptLogs: [...state.scriptLogs, `[ERROR] Pre-request: ${err.message}`] }));
      }
    }

    const startTime = performance.now();

    try {
      const activeHeaders: Record<string, string> = {};
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

      // Execute test script
      let testResults: TestResult[] = [];
      let testLogs: string[] = [];
      if (testScript.trim()) {
        try {
          const result = executeTestScript(testScript, responseData);
          testResults = result.results;
          testLogs = result.logs;
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
    } catch (err: any) {
      if (err.name === "AbortError") {
        set({ error: "Request cancelled", isLoading: false });
      } else {
        set({
          error: err.message || "Request failed",
          isLoading: false,
          consoleLogs: [...get().consoleLogs, { type: "error" as const, message: `Error: ${err.message}`, timestamp: Date.now() }],
        });
      }
    } finally {
      abortController = null;
    }
  },
}));

function executeTestScript(script: string, response: ResponseData): { results: TestResult[]; logs: string[] } {
  const results: TestResult[] = [];
  const logs: string[] = [];

  const pm = {
    response: {
      status: response.status,
      time: response.time,
      headers: response.headers,
      json: () => { try { return JSON.parse(response.body); } catch { return null; } },
      text: () => response.body,
    },
    test: (name: string, fn: () => void) => {
      try { fn(); results.push({ name, passed: true }); }
      catch (err: any) { results.push({ name, passed: false, error: err.message }); }
    },
    expect: (value: any) => ({
      to: {
        equal: (expected: any) => { if (value !== expected) throw new Error(`Expected ${expected}, got ${value}`); },
        exist: undefined as any,
        be: {
          below: (max: number) => { if (value >= max) throw new Error(`Expected ${value} to be below ${max}`); },
          above: (min: number) => { if (value <= min) throw new Error(`Expected ${value} to be above ${min}`); },
        },
        include: (item: any) => {
          if (typeof value === "string" && !value.includes(item)) throw new Error(`Expected to include "${item}"`);
          if (Array.isArray(value) && !value.includes(item)) throw new Error(`Expected array to include ${item}`);
        },
        have: {
          property: (prop: string) => {
            if (typeof value !== "object" || !(prop in value)) throw new Error(`Expected to have property "${prop}"`);
          },
        },
      },
    }),
    variables: {
      set: (key: string, value: string) => useEnvironmentStore.getState().setVariable(key, value),
      get: (key: string) => useEnvironmentStore.getState().getVariable(key) || "",
    },
    globals: {
      set: (key: string, value: string) => useEnvironmentStore.getState().setGlobalVariable(key, value),
      get: (key: string) => useEnvironmentStore.getState().getGlobalVariable(key) || "",
    },
    environment: {
      set: (key: string, value: string) => useEnvironmentStore.getState().setVariable(key, value),
      get: (key: string) => useEnvironmentStore.getState().getVariable(key) || "",
    },
  };

  try {
    const fn = new Function("pm", "console", script);
    fn(pm, { log: (msg: string) => logs.push(String(msg)) });
  } catch (err: any) {
    logs.push(`[ERROR] ${err.message}`);
  }

  return { results, logs };
}
