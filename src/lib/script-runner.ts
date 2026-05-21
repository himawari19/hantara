/**
 * Script Runner - Executes pre-request and test scripts in a sandboxed environment
 * Similar to Postman's scripting engine
 */

export interface ScriptContext {
  // Request data (mutable in pre-request)
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  };
  // Response data (available in test scripts)
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
  };
  // Environment variables
  variables: Record<string, string>;
  // Collection variables
  collectionVariables: Record<string, string>;
  // Global variables
  globals: Record<string, string>;
}

export interface ScriptResult {
  success: boolean;
  logs: string[];
  errors: string[];
  testResults: TestResult[];
  updatedVariables: Record<string, string>;
  updatedCollectionVariables: Record<string, string>;
  updatedGlobals: Record<string, string>;
  updatedRequest?: ScriptContext["request"];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export function runScript(script: string, context: ScriptContext): ScriptResult {
  const logs: string[] = [];
  const errors: string[] = [];
  const testResults: TestResult[] = [];
  const updatedVariables = { ...context.variables };
  const updatedCollectionVariables = { ...context.collectionVariables };
  const updatedGlobals = { ...context.globals };
  const updatedRequest = { ...context.request };

  if (!script.trim()) {
    return {
      success: true,
      logs,
      errors,
      testResults,
      updatedVariables,
      updatedCollectionVariables,
      updatedGlobals,
      updatedRequest,
    };
  }

  // Build the sandbox API (similar to Postman's pm object)
  const pm = {
    request: {
      ...updatedRequest,
      headers: { ...updatedRequest.headers },
      addHeader: (key: string, value: string) => {
        updatedRequest.headers[key] = value;
      },
      removeHeader: (key: string) => {
        delete updatedRequest.headers[key];
      },
    },
    response: context.response
      ? {
          ...context.response,
          json: () => {
            try {
              return JSON.parse(context.response!.body);
            } catch {
              return null;
            }
          },
          text: () => context.response!.body,
        }
      : undefined,
    variables: {
      get: (key: string) => updatedVariables[key] || "",
      set: (key: string, value: string) => {
        updatedVariables[key] = value;
      },
      has: (key: string) => key in updatedVariables,
    },
    collectionVariables: {
      get: (key: string) => updatedCollectionVariables[key] || "",
      set: (key: string, value: string) => {
        updatedCollectionVariables[key] = value;
      },
      has: (key: string) => key in updatedCollectionVariables,
    },
    globals: {
      get: (key: string) => updatedGlobals[key] || "",
      set: (key: string, value: string) => {
        updatedGlobals[key] = value;
      },
      has: (key: string) => key in updatedGlobals,
    },
    environment: {
      get: (key: string) => updatedVariables[key] || "",
      set: (key: string, value: string) => {
        updatedVariables[key] = value;
      },
    },
    test: (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({ name, passed: true });
      } catch (e: any) {
        testResults.push({ name, passed: false, error: e.message });
      }
    },
    expect: (value: any) => createExpect(value),
  };

  // Console mock
  const console = {
    log: (...args: any[]) => logs.push(args.map(String).join(" ")),
    info: (...args: any[]) => logs.push(`[INFO] ${args.map(String).join(" ")}`),
    warn: (...args: any[]) => logs.push(`[WARN] ${args.map(String).join(" ")}`),
    error: (...args: any[]) => errors.push(args.map(String).join(" ")),
  };

  try {
    // Create a function with the script and execute it
    const fn = new Function("pm", "console", script);
    fn(pm, console);

    return {
      success: true,
      logs,
      errors,
      testResults,
      updatedVariables,
      updatedCollectionVariables,
      updatedGlobals,
      updatedRequest,
    };
  } catch (e: any) {
    errors.push(e.message || "Script execution failed");
    return {
      success: false,
      logs,
      errors,
      testResults,
      updatedVariables,
      updatedCollectionVariables,
      updatedGlobals,
      updatedRequest,
    };
  }
}

function createExpect(value: any) {
  return {
    to: {
      equal: (expected: any) => {
        if (value !== expected) {
          throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
        }
      },
      not: {
        equal: (expected: any) => {
          if (value === expected) {
            throw new Error(`Expected ${JSON.stringify(value)} to not equal ${JSON.stringify(expected)}`);
          }
        },
      },
      be: {
        above: (n: number) => {
          if (value <= n) throw new Error(`Expected ${value} to be above ${n}`);
        },
        below: (n: number) => {
          if (value >= n) throw new Error(`Expected ${value} to be below ${n}`);
        },
        true: (() => {
          if (value !== true) throw new Error(`Expected ${value} to be true`);
        }) as any,
        false: (() => {
          if (value !== false) throw new Error(`Expected ${value} to be false`);
        }) as any,
        null: (() => {
          if (value !== null) throw new Error(`Expected ${value} to be null`);
        }) as any,
        undefined: (() => {
          if (value !== undefined) throw new Error(`Expected ${value} to be undefined`);
        }) as any,
      },
      have: {
        status: (code: number) => {
          if (value?.status !== code) {
            throw new Error(`Expected status ${code} but got ${value?.status}`);
          }
        },
        property: (prop: string) => {
          if (!(prop in value)) {
            throw new Error(`Expected object to have property "${prop}"`);
          }
        },
        length: (len: number) => {
          if (value?.length !== len) {
            throw new Error(`Expected length ${len} but got ${value?.length}`);
          }
        },
      },
      include: (item: any) => {
        if (typeof value === "string") {
          if (!value.includes(item)) {
            throw new Error(`Expected "${value}" to include "${item}"`);
          }
        } else if (Array.isArray(value)) {
          if (!value.includes(item)) {
            throw new Error(`Expected array to include ${JSON.stringify(item)}`);
          }
        }
      },
      exist: (() => {
        if (value === null || value === undefined) {
          throw new Error(`Expected value to exist but got ${value}`);
        }
      }) as any,
    },
  };
}
