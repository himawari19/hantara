import { RequestItem } from "@/store/collection-store";

interface OpenAPIPath {
  [method: string]: {
    summary?: string;
    operationId?: string;
    description?: string;
    parameters?: {
      name: string;
      in: "query" | "header" | "path" | "cookie";
      required?: boolean;
      schema?: { type?: string; default?: any };
    }[];
    requestBody?: {
      content?: {
        [mediaType: string]: {
          schema?: any;
          example?: any;
        };
      };
    };
    responses?: Record<string, any>;
    tags?: string[];
    security?: any[];
  };
}

interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: { url: string; description?: string }[];
  host?: string; // Swagger 2.0
  basePath?: string; // Swagger 2.0
  schemes?: string[]; // Swagger 2.0
  paths?: Record<string, OpenAPIPath>;
  tags?: { name: string; description?: string }[];
}

export interface ImportedCollection {
  name: string;
  folders: { name: string; requests: Partial<RequestItem>[] }[];
  requests: Partial<RequestItem>[];
}

const VALID_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];

export function parseOpenAPISpec(jsonOrYaml: string): ImportedCollection | null | undefined {
  let spec: OpenAPISpec;
  try {
    spec = JSON.parse(jsonOrYaml);
  } catch {
    // Try basic YAML-like parsing (key: value on separate lines)
    try {
      spec = simpleYamlParse(jsonOrYaml);
    } catch {
      return null;
    }
  }

  if (!spec || (!spec.openapi && !spec.swagger)) return null;

  const title = spec.info?.title || "Imported API";
  const baseUrl = getBaseUrl(spec);

  const result: ImportedCollection = { name: title, folders: [], requests: [] };
  const tagMap: Record<string, Partial<RequestItem>[]> = {};

  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!VALID_METHODS.includes(method.toLowerCase())) continue;

        const op = operation as OpenAPIPath[string];
        const name = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
        const url = `${baseUrl}${path}`;

        // Build headers from parameters
        const headers: { key: string; value: string; enabled: boolean }[] = [];
        const params: { key: string; value: string; enabled: boolean }[] = [];

        if (op.parameters) {
          for (const param of op.parameters) {
            if (param.in === "header") {
              headers.push({ key: param.name, value: param.schema?.default || "", enabled: true });
            } else if (param.in === "query") {
              params.push({ key: param.name, value: param.schema?.default || "", enabled: true });
            }
          }
        }

        // Add empty row at end
        headers.push({ key: "", value: "", enabled: true });
        params.push({ key: "", value: "", enabled: true });

        // Body
        let body = "";
        let bodyType: RequestItem["bodyType"] = "none";
        if (op.requestBody?.content) {
          const jsonContent = op.requestBody.content["application/json"];
          if (jsonContent) {
            bodyType = "json";
            if (jsonContent.example) {
              body = JSON.stringify(jsonContent.example, null, 2);
            } else if (jsonContent.schema) {
              body = JSON.stringify(generateExampleFromSchema(jsonContent.schema), null, 2);
            }
          }
          // Add content-type header
          const contentType = Object.keys(op.requestBody.content)[0];
          if (contentType && !headers.some((h) => h.key.toLowerCase() === "content-type")) {
            headers.unshift({ key: "Content-Type", value: contentType, enabled: true });
          }
        }

        const request: Partial<RequestItem> = {
          name,
          method: method.toUpperCase() as RequestItem["method"],
          url,
          headers,
          params,
          body,
          bodyType,
          requestType: "http",
          preScript: "",
          testScript: "",
          authType: "none",
          authConfig: {},
        };

        // Group by tags
        const tag = op.tags?.[0];
        if (tag) {
          if (!tagMap[tag]) tagMap[tag] = [];
          tagMap[tag].push(request);
        } else {
          result.requests.push(request);
        }
      }
    }
  }

  // Convert tag map to folders
  for (const [tag, requests] of Object.entries(tagMap)) {
    result.folders.push({ name: tag, requests });
  }

  return result;
}

function getBaseUrl(spec: OpenAPISpec): string {
  // OpenAPI 3.x
  if (spec.servers && spec.servers.length > 0) {
    return spec.servers[0].url.replace(/\/$/, "");
  }
  // Swagger 2.0
  if (spec.host) {
    const scheme = spec.schemes?.[0] || "https";
    const basePath = spec.basePath || "";
    return `${scheme}://${spec.host}${basePath}`.replace(/\/$/, "");
  }
  return "{{baseUrl}}";
}

function generateExampleFromSchema(schema: any): any {
  if (!schema) return {};
  if (schema.example !== undefined) return schema.example;

  switch (schema.type) {
    case "object": {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExampleFromSchema(prop as any);
        }
      }
      return obj;
    }
    case "array":
      return [generateExampleFromSchema(schema.items)];
    case "string":
      return schema.enum?.[0] || "string";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    default:
      return null;
  }
}

// Very basic YAML-to-JSON parser for simple specs
function simpleYamlParse(yaml: string): any {
  // This is a minimal parser - for complex YAML, users should convert to JSON first
  // Just try JSON.parse as fallback
  throw new Error("YAML not supported - please convert to JSON");
}
