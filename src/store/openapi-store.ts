import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface OpenAPIEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  responses: Record<string, { description?: string; schema?: any }>;
}

export interface OpenAPISpec {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  endpoints: OpenAPIEndpoint[];
  rawSpec: any;
  importedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: { path: string; message: string; expected?: string; actual?: string }[];
  endpoint?: OpenAPIEndpoint;
}

interface OpenAPIState {
  specs: OpenAPISpec[];
  activeSpecId: string | null;

  importSpec: (name: string, spec: any) => void;
  removeSpec: (id: string) => void;
  setActiveSpec: (id: string | null) => void;
  getActiveSpec: () => OpenAPISpec | null;
  findEndpoint: (method: string, url: string) => OpenAPIEndpoint | null;
  validateResponse: (method: string, url: string, status: number, body: string) => ValidationResult;
}

function generateId(): string {
  return crypto.randomUUID();
}

function parseOpenAPISpec(raw: any): { version: string; baseUrl: string; endpoints: OpenAPIEndpoint[] } {
  const isV3 = raw.openapi && raw.openapi.startsWith("3");
  const isV2 = raw.swagger && raw.swagger.startsWith("2");

  let baseUrl = "";
  if (isV3 && raw.servers && raw.servers.length > 0) {
    baseUrl = raw.servers[0].url || "";
  } else if (isV2) {
    const scheme = (raw.schemes && raw.schemes[0]) || "https";
    baseUrl = `${scheme}://${raw.host || ""}${raw.basePath || ""}`;
  }

  const endpoints: OpenAPIEndpoint[] = [];
  const paths = raw.paths || {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      if (["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) {
        const responses: Record<string, { description?: string; schema?: any }> = {};

        if (operation.responses) {
          for (const [statusCode, resp] of Object.entries(operation.responses as Record<string, any>)) {
            let schema: any = null;
            if (isV3 && resp.content) {
              const jsonContent = resp.content["application/json"];
              if (jsonContent) schema = jsonContent.schema;
            } else if (isV2 && resp.schema) {
              schema = resp.schema;
            }
            responses[statusCode] = { description: resp.description, schema: resolveSchema(schema, raw) };
          }
        }

        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId,
          summary: operation.summary,
          responses,
        });
      }
    }
  }

  return { version: isV3 ? raw.openapi : raw.swagger, baseUrl, endpoints };
}

// Simple $ref resolver (one level deep)
function resolveSchema(schema: any, root: any): any {
  if (!schema) return null;
  if (schema.$ref) {
    const refPath = schema.$ref.replace("#/", "").split("/");
    let resolved = root;
    for (const part of refPath) {
      resolved = resolved?.[part];
    }
    return resolved || schema;
  }
  if (schema.properties) {
    const resolved: any = { ...schema, properties: {} };
    for (const [key, prop] of Object.entries(schema.properties)) {
      resolved.properties[key] = resolveSchema(prop, root);
    }
    return resolved;
  }
  if (schema.items) {
    return { ...schema, items: resolveSchema(schema.items, root) };
  }
  return schema;
}

function matchPath(specPath: string, actualPath: string): boolean {
  // Convert /users/{id} to regex /users/[^/]+
  const regex = specPath.replace(/\{[^}]+\}/g, "[^/]+");
  return new RegExp(`^${regex}$`).test(actualPath);
}

function validateAgainstSchema(data: any, schema: any, path: string = ""): { path: string; message: string; expected?: string; actual?: string }[] {
  const errors: { path: string; message: string; expected?: string; actual?: string }[] = [];
  if (!schema) return errors;

  // Type check
  if (schema.type) {
    const actualType = Array.isArray(data) ? "array" : typeof data === "object" && data !== null ? "object" : typeof data;
    if (schema.type === "integer" && (typeof data !== "number" || !Number.isInteger(data))) {
      errors.push({ path: path || "/", message: `Expected integer`, expected: "integer", actual: actualType });
    } else if (schema.type === "number" && typeof data !== "number") {
      errors.push({ path: path || "/", message: `Expected number`, expected: "number", actual: actualType });
    } else if (schema.type === "string" && typeof data !== "string") {
      errors.push({ path: path || "/", message: `Expected string`, expected: "string", actual: actualType });
    } else if (schema.type === "boolean" && typeof data !== "boolean") {
      errors.push({ path: path || "/", message: `Expected boolean`, expected: "boolean", actual: actualType });
    } else if (schema.type === "array" && !Array.isArray(data)) {
      errors.push({ path: path || "/", message: `Expected array`, expected: "array", actual: actualType });
    } else if (schema.type === "object" && (typeof data !== "object" || data === null || Array.isArray(data))) {
      errors.push({ path: path || "/", message: `Expected object`, expected: "object", actual: actualType });
    }
  }

  // Required fields
  if (schema.required && Array.isArray(schema.required) && typeof data === "object" && data !== null) {
    for (const field of schema.required) {
      if (!(field in data)) {
        errors.push({ path: `${path}/${field}`, message: `Required field missing`, expected: "present", actual: "missing" });
      }
    }
  }

  // Properties
  if (schema.properties && typeof data === "object" && data !== null && !Array.isArray(data)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        errors.push(...validateAgainstSchema(data[key], propSchema, `${path}/${key}`));
      }
    }
  }

  // Array items
  if (schema.items && Array.isArray(data)) {
    data.slice(0, 5).forEach((item: any, i: number) => {
      errors.push(...validateAgainstSchema(item, schema.items, `${path}[${i}]`));
    });
  }

  // Enum
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({ path: path || "/", message: `Value not in enum`, expected: schema.enum.join(" | "), actual: String(data) });
  }

  return errors;
}

export const useOpenAPIStore = create<OpenAPIState>()(
  persist(
    (set, get) => ({
      specs: [],
      activeSpecId: null,

      importSpec: (name, rawSpec) => {
        const { version, baseUrl, endpoints } = parseOpenAPISpec(rawSpec);
        const spec: OpenAPISpec = {
          id: generateId(),
          name,
          version,
          baseUrl,
          endpoints,
          rawSpec,
          importedAt: Date.now(),
        };
        set((state) => ({
          specs: [...state.specs, spec],
          activeSpecId: spec.id,
        }));
      },

      removeSpec: (id) => {
        set((state) => ({
          specs: state.specs.filter((s) => s.id !== id),
          activeSpecId: state.activeSpecId === id ? null : state.activeSpecId,
        }));
      },

      setActiveSpec: (id) => set({ activeSpecId: id }),

      getActiveSpec: () => {
        const { specs, activeSpecId } = get();
        return specs.find((s) => s.id === activeSpecId) || null;
      },

      findEndpoint: (method, url) => {
        const spec = get().getActiveSpec();
        if (!spec) return null;

        // Extract path from URL
        let path = url;
        try {
          const urlObj = new URL(url);
          path = urlObj.pathname;
        } catch {
          // URL might be relative or have variables
          const match = url.match(/https?:\/\/[^/]+(\/.*)/);
          if (match) path = match[1];
        }

        // Remove base URL prefix
        if (spec.baseUrl) {
          try {
            const baseUrlObj = new URL(spec.baseUrl);
            if (path.startsWith(baseUrlObj.pathname)) {
              path = path.slice(baseUrlObj.pathname.length) || "/";
            }
          } catch {
            // ignore
          }
        }

        return spec.endpoints.find((ep) =>
          ep.method === method.toUpperCase() && matchPath(ep.path, path)
        ) || null;
      },

      validateResponse: (method, url, status, body) => {
        const endpoint = get().findEndpoint(method, url);
        if (!endpoint) {
          return { valid: true, errors: [], endpoint: undefined };
        }

        const statusStr = String(status);
        const responseSpec = endpoint.responses[statusStr] || endpoint.responses["default"];

        if (!responseSpec) {
          return {
            valid: false,
            errors: [{ path: "/", message: `Status ${status} not defined in spec`, expected: Object.keys(endpoint.responses).join(", "), actual: statusStr }],
            endpoint,
          };
        }

        if (!responseSpec.schema) {
          return { valid: true, errors: [], endpoint };
        }

        let parsedBody: any;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          return {
            valid: false,
            errors: [{ path: "/", message: "Response body is not valid JSON", expected: "JSON", actual: "non-JSON" }],
            endpoint,
          };
        }

        const errors = validateAgainstSchema(parsedBody, responseSpec.schema);
        return { valid: errors.length === 0, errors, endpoint };
      },
    }),
    {
      name: "hantara-openapi",
      storage: idbStorage,
      partialize: (state) => ({ specs: state.specs, activeSpecId: state.activeSpecId }),
    }
  )
);
