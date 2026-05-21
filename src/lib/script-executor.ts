/**
 * Script Executor — runs pre-request and test scripts via Web Worker.
 * 
 * Falls back to main-thread execution if Worker is unavailable.
 * Includes a timeout (10s) to kill runaway scripts.
 */

import type { ResponseData, TestResult } from "@/store/response-store";

interface ScriptResult {
  logs: string[];
  testResults: TestResult[];
  variableUpdates: { key: string; value: string }[];
  globalUpdates: { key: string; value: string }[];
}

const SCRIPT_TIMEOUT = 10_000; // 10 seconds max

let worker: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;

  if (!worker) {
    try {
      worker = new Worker(new URL("./script-worker.ts", import.meta.url), { type: "module" });
    } catch {
      // Worker creation failed (e.g., CSP restrictions)
      return null;
    }
  }
  return worker;
}

export function executePreRequestScript(
  script: string,
  variables: Record<string, string>,
  globals: Record<string, string>
): Promise<ScriptResult> {
  return executeInWorker("pre-request", script, undefined, variables, globals);
}

export function executeTestScriptAsync(
  script: string,
  responseData: ResponseData,
  variables: Record<string, string>,
  globals: Record<string, string>
): Promise<ScriptResult> {
  return executeInWorker("test", script, responseData, variables, globals);
}

function executeInWorker(
  type: "pre-request" | "test",
  script: string,
  responseData?: ResponseData,
  variables: Record<string, string> = {},
  globals: Record<string, string> = {}
): Promise<ScriptResult> {
  const w = getWorker();

  if (!w) {
    // Fallback: run on main thread (same behavior as before)
    return Promise.resolve(executeOnMainThread(type, script, responseData, variables, globals));
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // Kill the worker if script takes too long
      w.terminate();
      worker = null; // Will recreate on next call
      resolve({
        logs: ["[ERROR] Script timed out after 10 seconds"],
        testResults: [],
        variableUpdates: [],
        globalUpdates: [],
      });
    }, SCRIPT_TIMEOUT);

    const handler = (event: MessageEvent) => {
      clearTimeout(timeout);
      w.removeEventListener("message", handler);
      resolve(event.data);
    };

    w.addEventListener("message", handler);
    w.postMessage({ type, script, responseData, variables, globals });
  });
}

/**
 * Fallback: execute script on main thread (same as original behavior).
 */
function executeOnMainThread(
  type: "pre-request" | "test",
  script: string,
  responseData?: ResponseData,
  variables: Record<string, string> = {},
  globals: Record<string, string> = {}
): ScriptResult {
  const logs: string[] = [];
  const testResults: TestResult[] = [];
  const variableUpdates: { key: string; value: string }[] = [];
  const globalUpdates: { key: string; value: string }[] = [];

  const localVars = { ...variables };
  const localGlobals = { ...globals };

  const pm: any = {
    variables: {
      set: (key: string, value: string) => { localVars[key] = value; variableUpdates.push({ key, value }); },
      get: (key: string) => localVars[key] || "",
    },
    globals: {
      set: (key: string, value: string) => { localGlobals[key] = value; globalUpdates.push({ key, value }); },
      get: (key: string) => localGlobals[key] || "",
    },
    environment: {
      set: (key: string, value: string) => { localVars[key] = value; variableUpdates.push({ key, value }); },
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

  try {
    const fn = new Function("pm", "console", script);
    fn(pm, { log: (msg: any) => logs.push(String(msg)) });
  } catch (err: any) {
    logs.push(`[ERROR] ${err.message}`);
  }

  return { logs, testResults, variableUpdates, globalUpdates };
}
