/**
 * Export utilities - Export collections to various formats
 */

import { Collection, RequestItem, Folder } from "@/store/collection-store";

// ============================================
// EXPORT TO POSTMAN v2.1
// ============================================

export function exportToPostman(collection: Collection): string {
  const postmanCollection = {
    info: {
      _postman_id: collection.id,
      name: collection.name,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [
      ...collection.folders.map(folderToPostmanItem),
      ...collection.requests.map(requestToPostmanItem),
    ],
    variable: (collection.variables || [])
      .filter((v) => v.enabled && v.key.trim())
      .map((v) => ({ key: v.key, value: v.value, type: "string" })),
  };

  return JSON.stringify(postmanCollection, null, 2);
}

function folderToPostmanItem(folder: Folder): any {
  return {
    name: folder.name,
    item: [
      ...folder.folders.map(folderToPostmanItem),
      ...folder.requests.map(requestToPostmanItem),
    ],
  };
}

function requestToPostmanItem(req: RequestItem): any {
  const item: any = {
    name: req.name,
    request: {
      method: req.method,
      header: req.headers
        .filter((h) => h.key.trim())
        .map((h) => ({ key: h.key, value: h.value, disabled: !h.enabled })),
      url: {
        raw: req.url,
        ...(parseUrlForPostman(req.url)),
      },
    },
  };

  if (req.body && req.bodyType !== "none") {
    item.request.body = {
      mode: req.bodyType === "json" ? "raw" : req.bodyType === "form-data" ? "formdata" : "raw",
      raw: req.body,
      options: req.bodyType === "json" ? { raw: { language: "json" } } : undefined,
    };
  }

  if (req.preScript) {
    item.event = item.event || [];
    item.event.push({
      listen: "prerequest",
      script: { exec: req.preScript.split("\n"), type: "text/javascript" },
    });
  }

  if (req.testScript) {
    item.event = item.event || [];
    item.event.push({
      listen: "test",
      script: { exec: req.testScript.split("\n"), type: "text/javascript" },
    });
  }

  return item;
}

function parseUrlForPostman(url: string): any {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname.split("."),
      path: parsed.pathname.split("/").filter(Boolean),
      query: Array.from(parsed.searchParams.entries()).map(([key, value]) => ({ key, value })),
    };
  } catch {
    return {};
  }
}

// ============================================
// EXPORT TO OPENAPI 3.0
// ============================================

export function exportToOpenAPI(collection: Collection): string {
  const paths: Record<string, any> = {};

  const allRequests = getAllRequests(collection);

  for (const req of allRequests) {
    try {
      const parsed = new URL(req.url.startsWith("http") ? req.url : `https://${req.url}`);
      const path = parsed.pathname || "/";
      const method = req.method.toLowerCase();

      if (!paths[path]) paths[path] = {};

      paths[path][method] = {
        summary: req.name,
        parameters: req.headers
          .filter((h) => h.enabled && h.key.trim())
          .map((h) => ({
            name: h.key,
            in: "header",
            schema: { type: "string" },
            example: h.value,
          })),
      };

      if (req.body && req.bodyType !== "none") {
        paths[path][method].requestBody = {
          content: {
            "application/json": {
              example: tryParseJSON(req.body),
            },
          },
        };
      }
    } catch {
      // Skip invalid URLs
    }
  }

  const spec = {
    openapi: "3.0.3",
    info: {
      title: collection.name,
      version: "1.0.0",
    },
    paths,
  };

  return JSON.stringify(spec, null, 2);
}

// ============================================
// EXPORT TO cURL
// ============================================

export function exportToCurl(req: RequestItem): string {
  let curl = `curl -X ${req.method}`;

  // URL
  curl += ` '${req.url}'`;

  // Headers
  req.headers
    .filter((h) => h.enabled && h.key.trim())
    .forEach((h) => {
      curl += ` \\\n  -H '${h.key}: ${h.value}'`;
    });

  // Body
  if (req.body && req.bodyType !== "none") {
    if (req.bodyType === "json") {
      curl += ` \\\n  -H 'Content-Type: application/json'`;
    }
    curl += ` \\\n  -d '${req.body.replace(/'/g, "\\'")}'`;
  }

  return curl;
}

// ============================================
// EXPORT TO FETCH (JavaScript)
// ============================================

export function exportToFetch(req: RequestItem): string {
  const headers = req.headers
    .filter((h) => h.enabled && h.key.trim())
    .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {} as Record<string, string>);

  const options: any = {
    method: req.method,
  };

  if (Object.keys(headers).length > 0) {
    options.headers = headers;
  }

  if (req.body && req.bodyType !== "none") {
    options.body = req.bodyType === "json" ? `JSON.stringify(${req.body})` : `'${req.body}'`;
  }

  let code = `const response = await fetch('${req.url}'`;

  if (Object.keys(options).length > 1 || options.headers) {
    code += `, {\n`;
    code += `  method: '${req.method}',\n`;
    if (options.headers) {
      code += `  headers: ${JSON.stringify(options.headers, null, 4).replace(/\n/g, "\n  ")},\n`;
    }
    if (options.body) {
      code += `  body: ${options.body},\n`;
    }
    code += `}`;
  }

  code += `);\n\nconst data = await response.json();\nconsole.log(data);`;

  return code;
}

// ============================================
// HELPERS
// ============================================

function getAllRequests(collection: Collection): RequestItem[] {
  const requests: RequestItem[] = [...collection.requests];

  function collectFromFolders(folders: Folder[]) {
    for (const folder of folders) {
      requests.push(...folder.requests);
      collectFromFolders(folder.folders);
    }
  }

  collectFromFolders(collection.folders);
  return requests;
}

function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
