"use client";

import { useState } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { X, Globe, Copy, Check, Download, Eye, Code, Palette } from "lucide-react";

interface PublishableDocsProps {
  onClose: () => void;
}

type DocTheme = "dark" | "light" | "ocean";

export function PublishableDocs({ onClose }: PublishableDocsProps) {
  const { collections } = useCollectionStore();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || "");
  const [theme, setTheme] = useState<DocTheme>("dark");
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<"preview" | "html" | "openapi">("preview");
  const [includeExamples, setIncludeExamples] = useState(true);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);

  const handleCopy = async () => {
    const content = activeView === "openapi"
      ? generateOpenAPI(selectedCollection!)
      : activeView === "html"
      ? generatePublishableHTML(selectedCollection!, theme, includeExamples)
      : generateMarkdown(selectedCollection!, includeExamples);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selectedCollection) return;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (activeView === "openapi") {
      content = generateOpenAPI(selectedCollection);
      filename = `${selectedCollection.name.replace(/\s+/g, "-").toLowerCase()}-openapi.yaml`;
      mimeType = "text/yaml";
    } else if (activeView === "html") {
      content = generatePublishableHTML(selectedCollection, theme, includeExamples);
      filename = `${selectedCollection.name.replace(/\s+/g, "-").toLowerCase()}-docs.html`;
      mimeType = "text/html";
    } else {
      content = generateMarkdown(selectedCollection, includeExamples);
      filename = `${selectedCollection.name.replace(/\s+/g, "-").toLowerCase()}-docs.md`;
      mimeType = "text/markdown";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Publishable API Docs</h2>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-secondary)]">Collection:</label>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Select collection"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] p-0.5">
            <button
              type="button"
              onClick={() => setActiveView("preview")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${activeView === "preview" ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
            >
              <Eye size={10} /> Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveView("html")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${activeView === "html" ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
            >
              <Code size={10} /> HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveView("openapi")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] ${activeView === "openapi" ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
            >
              <Code size={10} /> OpenAPI
            </button>
          </div>

          {/* Theme (HTML only) */}
          {activeView === "html" && (
            <div className="flex items-center gap-2">
              <Palette size={12} className="text-[var(--text-secondary)]" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as DocTheme)}
                className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none"
                aria-label="Select theme"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="ocean">Ocean</option>
              </select>
            </div>
          )}

          {/* Include Examples */}
          <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={includeExamples}
              onChange={(e) => setIncludeExamples(e.target.checked)}
              className="rounded"
            />
            Include examples
          </label>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
            >
              <Download size={12} /> Download
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {selectedCollection && activeView === "preview" && (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--text-primary)]">
                {generateMarkdown(selectedCollection, includeExamples)}
              </pre>
            </div>
          )}
          {selectedCollection && activeView === "html" && (
            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]">
              {generatePublishableHTML(selectedCollection, theme, includeExamples)}
            </pre>
          )}
          {selectedCollection && activeView === "openapi" && (
            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]">
              {generateOpenAPI(selectedCollection)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// GENERATORS
// ============================================

function generateMarkdown(collection: Collection, includeExamples: boolean): string {
  let md = `# ${collection.name} API Documentation\n\n`;
  md += `> Auto-generated from Hantara API Client\n\n`;
  md += `## Base URL\n\n`;
  md += `\`\`\`\n${getBaseUrl(collection)}\n\`\`\`\n\n`;
  md += `---\n\n`;

  if (collection.auth && collection.auth.type !== "none") {
    md += `## Authentication\n\n`;
    md += `This API uses **${collection.auth.type}** authentication.\n\n`;
    md += `---\n\n`;
  }

  md += `## Endpoints\n\n`;

  for (const req of collection.requests) {
    md += formatRequestMd(req, includeExamples);
  }

  for (const folder of collection.folders) {
    md += formatFolderMd(folder, 3, includeExamples);
  }

  return md;
}

function formatFolderMd(folder: Folder, level: number, includeExamples: boolean): string {
  const heading = "#".repeat(Math.min(level, 6));
  let md = `${heading} ${folder.name}\n\n`;

  if (folder.auth && folder.auth.type !== "none") {
    md += `> Auth: ${folder.auth.type}\n\n`;
  }

  for (const req of folder.requests) {
    md += formatRequestMd(req, includeExamples);
  }

  for (const sub of folder.folders) {
    md += formatFolderMd(sub, level + 1, includeExamples);
  }

  return md;
}

function formatRequestMd(req: RequestItem, includeExamples: boolean): string {
  let md = `### \`${req.method}\` ${req.name}\n\n`;
  md += `**Endpoint:** \`${req.url || "(no URL)"}\`\n\n`;

  const activeHeaders = req.headers.filter((h) => h.enabled && h.key.trim());
  if (activeHeaders.length > 0) {
    md += `**Headers:**\n\n| Header | Value |\n|--------|-------|\n`;
    for (const h of activeHeaders) {
      md += `| \`${h.key}\` | \`${h.value}\` |\n`;
    }
    md += `\n`;
  }

  const activeParams = req.params?.filter((p) => p.enabled && p.key.trim()) || [];
  if (activeParams.length > 0) {
    md += `**Query Parameters:**\n\n| Parameter | Value |\n|-----------|-------|\n`;
    for (const p of activeParams) {
      md += `| \`${p.key}\` | \`${p.value}\` |\n`;
    }
    md += `\n`;
  }

  if (includeExamples && req.bodyType !== "none" && req.body.trim()) {
    md += `**Request Body** (\`${req.bodyType}\`):\n\n`;
    md += "```json\n" + req.body + "\n```\n\n";
  }

  md += `---\n\n`;
  return md;
}

function generateOpenAPI(collection: Collection): string {
  const paths: Record<string, any> = {};
  const allRequests = getAllRequests(collection);

  for (const req of allRequests) {
    if (!req.url) continue;
    const path = extractPath(req.url);
    const method = req.method.toLowerCase();

    if (!paths[path]) paths[path] = {};
    paths[path][method] = {
      summary: req.name,
      parameters: (req.params || [])
        .filter((p) => p.enabled && p.key.trim())
        .map((p) => ({ name: p.key, in: "query", schema: { type: "string" }, example: p.value })),
      ...(req.bodyType !== "none" && req.body.trim()
        ? {
            requestBody: {
              content: {
                "application/json": {
                  example: tryParseJSON(req.body),
                },
              },
            },
          }
        : {}),
      responses: { "200": { description: "Successful response" } },
    };
  }

  const spec = {
    openapi: "3.0.3",
    info: { title: collection.name, version: "1.0.0", description: `API documentation for ${collection.name}` },
    servers: [{ url: getBaseUrl(collection) }],
    paths,
  };

  // Convert to YAML-like format (simplified)
  return yamlStringify(spec);
}

function generatePublishableHTML(collection: Collection, theme: DocTheme, includeExamples: boolean): string {
  const allRequests = getAllRequests(collection);
  const themeVars = getThemeVars(theme);

  const endpoints = allRequests
    .map((req) => {
      const headers = req.headers.filter((h) => h.enabled && h.key.trim());
      const params = (req.params || []).filter((p) => p.enabled && p.key.trim());

      return `
      <div class="endpoint">
        <div class="endpoint-header">
          <span class="method method-${req.method.toLowerCase()}">${req.method}</span>
          <span class="endpoint-name">${escapeHtml(req.name)}</span>
        </div>
        <div class="endpoint-url"><code>${escapeHtml(req.url || "(no URL)")}</code></div>
        ${headers.length > 0 ? `
          <div class="section">
            <h4>Headers</h4>
            <table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>
              ${headers.map((h) => `<tr><td><code>${escapeHtml(h.key)}</code></td><td><code>${escapeHtml(h.value)}</code></td></tr>`).join("")}
            </tbody></table>
          </div>
        ` : ""}
        ${params.length > 0 ? `
          <div class="section">
            <h4>Query Parameters</h4>
            <table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>
              ${params.map((p) => `<tr><td><code>${escapeHtml(p.key)}</code></td><td><code>${escapeHtml(p.value)}</code></td></tr>`).join("")}
            </tbody></table>
          </div>
        ` : ""}
        ${includeExamples && req.bodyType !== "none" && req.body.trim() ? `
          <div class="section">
            <h4>Request Body <span class="badge">${req.bodyType}</span></h4>
            <pre><code>${escapeHtml(req.body)}</code></pre>
          </div>
        ` : ""}
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(collection.name)} - API Documentation</title>
  <style>
    :root { ${themeVars} }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; padding: 3rem 2rem; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; color: var(--heading); }
    .subtitle { color: var(--muted); margin-bottom: 2rem; }
    .endpoint { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem; overflow: hidden; background: var(--card); }
    .endpoint-header { padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--border); }
    .endpoint-name { font-weight: 600; font-size: 0.95rem; }
    .endpoint-url { padding: 0.75rem 1.25rem; background: var(--code-bg); font-size: 0.85rem; }
    .endpoint-url code { color: var(--accent); }
    .section { padding: 1rem 1.25rem; border-top: 1px solid var(--border); }
    .section h4 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 0.4rem 0.75rem; background: var(--code-bg); font-size: 0.75rem; color: var(--muted); }
    td { padding: 0.4rem 0.75rem; border-top: 1px solid var(--border); }
    pre { background: var(--code-bg); padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; }
    code { font-family: 'SF Mono', 'Fira Code', monospace; }
    .method { font-weight: 700; font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
    .method-get { background: rgba(34,197,94,0.15); color: #22c55e; }
    .method-post { background: rgba(234,179,8,0.15); color: #eab308; }
    .method-put { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .method-patch { background: rgba(168,85,247,0.15); color: #a855f7; }
    .method-delete { background: rgba(239,68,68,0.15); color: #ef4444; }
    .method-head { background: rgba(107,114,128,0.15); color: #6b7280; }
    .method-options { background: rgba(107,114,128,0.15); color: #6b7280; }
    .badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 3px; background: var(--code-bg); color: var(--muted); margin-left: 0.5rem; }
    .footer { margin-top: 3rem; text-align: center; color: var(--muted); font-size: 0.75rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(collection.name)}</h1>
    <p class="subtitle">API Documentation • ${allRequests.length} endpoints</p>
    ${endpoints}
    <p class="footer">Generated by Hantara API Client • ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>`;
}

// ============================================
// HELPERS
// ============================================

function getAllRequests(collection: Collection): RequestItem[] {
  const requests: RequestItem[] = [...collection.requests];
  function collect(folders: Folder[]) {
    for (const f of folders) {
      requests.push(...f.requests);
      collect(f.folders);
    }
  }
  collect(collection.folders);
  return requests;
}

function getBaseUrl(collection: Collection): string {
  const allReqs = getAllRequests(collection);
  const firstUrl = allReqs.find((r) => r.url)?.url || "https://api.example.com";
  try {
    const url = new URL(firstUrl.replace(/\{\{[^}]+\}\}/g, "placeholder"));
    return `${url.protocol}//${url.host}`;
  } catch {
    return "https://api.example.com";
  }
}

function extractPath(url: string): string {
  try {
    const cleaned = url.replace(/\{\{([^}]+)\}\}/g, "{$1}");
    const parsed = new URL(cleaned.replace(/\{[^}]+\}/g, "placeholder"));
    let path = parsed.pathname;
    // Restore path params
    const originalParts = cleaned.split("/");
    const parts = path.split("/");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "placeholder" && originalParts[i + 3]) {
        parts[i] = originalParts[i + 3];
      }
    }
    return path || "/";
  } catch {
    return url;
  }
}

function tryParseJSON(str: string): any {
  try { return JSON.parse(str); } catch { return str; }
}

function getThemeVars(theme: DocTheme): string {
  switch (theme) {
    case "light":
      return "--bg:#ffffff;--text:#1f2937;--heading:#111827;--muted:#6b7280;--border:#e5e7eb;--card:#ffffff;--code-bg:#f3f4f6;--accent:#2563eb;";
    case "ocean":
      return "--bg:#0c1222;--text:#cbd5e1;--heading:#f1f5f9;--muted:#64748b;--border:#1e293b;--card:#0f172a;--code-bg:#1e293b;--accent:#38bdf8;";
    case "dark":
    default:
      return "--bg:#0f1117;--text:#e4e4e7;--heading:#fafafa;--muted:#71717a;--border:#27272a;--card:#1a1b23;--code-bg:#1f2028;--accent:#a78bfa;";
  }
}

function yamlStringify(obj: any, indent = 0): string {
  const pad = "  ".repeat(indent);
  let result = "";

  if (typeof obj === "string") return `"${obj}"`;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (obj === null) return "null";

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    for (const item of obj) {
      if (typeof item === "object" && item !== null) {
        result += `${pad}- `;
        const inner = yamlStringify(item, indent + 1).trim();
        result += inner.replace(/\n/g, `\n${pad}  `) + "\n";
      } else {
        result += `${pad}- ${yamlStringify(item, indent + 1)}\n`;
      }
    }
    return result;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj);
    for (const [key, value] of entries) {
      if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
        result += `${pad}${key}:\n${yamlStringify(value, indent + 1)}`;
      } else if (Array.isArray(value) && value.length > 0) {
        result += `${pad}${key}:\n${yamlStringify(value, indent + 1)}`;
      } else if (typeof value === "object" && value !== null && Object.keys(value).length === 0) {
        result += `${pad}${key}: {}\n`;
      } else {
        result += `${pad}${key}: ${yamlStringify(value, indent + 1)}\n`;
      }
    }
    return result;
  }

  return String(obj);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
