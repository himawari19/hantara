/**
 * Web Worker for executing pre-request and test scripts.
 * 
 * Runs user scripts in an isolated context off the main thread.
 * This prevents heavy/infinite-loop scripts from freezing the UI.
 * 
 * Communication:
 * - Main thread sends: { type, script, responseData?, variables? }
 * - Worker responds: { type, results?, logs?, variables? }
 */

// This file is the worker entry point — it runs in a separate thread.
// eslint-disable-next-line no-restricted-globals
const ctx = self as unknown as Worker;

interface WorkerMessage {
  type: "pre-request" | "test";
  script: string;
  responseData?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  };
  variables?: Record<string, string>;
  globals?: Record<string, string>;
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface WorkerResponse {
  type: "result";
  logs: string[];
  testResults: TestResult[];
  variableUpdates: { key: string; value: string }[];
  globalUpdates: { key: string; value: string }[];
  error?: string;
}

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, script, responseData, variables = {}, globals = {} } = event.data;

  const logs: string[] = [];
  const testResults: TestResult[] = [];
  const variableUpdates: { key: string; value: string }[] = [];
  const globalUpdates: { key: string; value: string }[] = [];

  const localVars = { ...variables };
  const localGlobals = { ...globals };

  const pm: any = {
    variables: {
      set: (key: string, value: string) => {
        localVars[key] = value;
        variableUpdates.push({ key, value });
      },
      get: (key: string) => localVars[key] || "",
    },
    globals: {
      set: (key: string, value: string) => {
        localGlobals[key] = value;
        globalUpdates.push({ key, value });
      },
      get: (key: string) => localGlobals[key] || "",
    },
    environment: {
      set: (key: string, value: string) => {
        localVars[key] = value;
        variableUpdates.push({ key, value });
      },
      get: (key: string) => localVars[key] || "",
    },
    request: { addHeader: () => {} },
  };

  if (type === "test" && responseData) {
    pm.response = {
      status: responseData.status,
      time: responseData.time,
      headers: responseData.headers,
      json: () => { try { return JSON.parse(responseData.body); } catch { return null; } },
      text: () => responseData.body,
    };
    pm.test = (name: string, fn: () => void) => {
      try { fn(); testResults.push({ name, passed: true }); }
      catch (err: any) { testResults.push({ name, passed: false, error: err.message }); }
    };
    pm.expect = (value: any) => ({
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
    });
  }

  const fakeConsole = { log: (msg: any) => logs.push(String(msg)) };

  try {
    const fn = new Function("pm", "console", script);
    fn(pm, fakeConsole);
  } catch (err: any) {
    logs.push(`[ERROR] ${err.message}`);
  }

  const response: WorkerResponse = {
    type: "result",
    logs,
    testResults,
    variableUpdates,
    globalUpdates,
  };

  ctx.postMessage(response);
};
