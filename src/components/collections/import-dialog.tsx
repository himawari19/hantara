"use client";

import { useState } from "react";
import { useCollectionStore, RequestItem } from "@/store/collection-store";
import { X, Upload, FileJson, Globe2 } from "lucide-react";
import { parseOpenAPISpec } from "@/lib/openapi-import";

interface ImportDialogProps {
  onClose: () => void;
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const { addCollection, addRequest, addFolder } = useCollectionStore();
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importType, setImportType] = useState<"json" | "curl" | "openapi">("json");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImportText(reader.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError(null);
    setSuccess(null);

    if (!importText.trim()) {
      setError("Please paste your collection data or cURL command.");
      return;
    }

    try {
      if (importType === "json") {
        const data = JSON.parse(importText);

        // Postman Collection v2.1 format
        if (data.info && data.item) {
          const collectionName = data.info.name || "Imported Collection";
          addCollection(collectionName);

          // Get the newly created collection
          const collections = useCollectionStore.getState().collections;
          const newCollection = collections[collections.length - 1];

          // Import items recursively
          let requestCount = 0;
          const importItems = (items: any[], folderId: string | null) => {
            items.forEach((item: any) => {
              if (item.item) {
                // It's a folder
                addFolder(newCollection.id, folderId, item.name || "Folder");
                const updatedCollections = useCollectionStore.getState().collections;
                const updatedCol = updatedCollections.find((c) => c.id === newCollection.id);
                if (updatedCol) {
                  const folders = folderId ? findAllFolders(updatedCol.folders) : updatedCol.folders;
                  const newFolder = folders[folders.length - 1];
                  if (newFolder) {
                    importItems(item.item, newFolder.id);
                  }
                }
              } else if (item.request) {
                // It's a request
                const req = item.request;
                const method = (typeof req.method === "string" ? req.method : "GET").toUpperCase();
                const url = typeof req.url === "string" ? req.url : req.url?.raw || "";
                const headers = Array.isArray(req.header)
                  ? req.header.map((h: any) => ({ key: h.key, value: h.value, enabled: !h.disabled }))
                  : [{ key: "", value: "", enabled: true }];

                let body = "";
                let bodyType: RequestItem["bodyType"] = "none";
                if (req.body) {
                  if (req.body.mode === "raw") {
                    body = req.body.raw || "";
                    bodyType = req.body.options?.raw?.language === "json" ? "json" : "raw";
                  } else if (req.body.mode === "formdata") {
                    bodyType = "form-data";
                  } else if (req.body.mode === "urlencoded") {
                    bodyType = "x-www-form-urlencoded";
                  }
                }

                addRequest(newCollection.id, folderId, {
                  name: item.name || url,
                  method: method as any,
                  url,
                  headers,
                  body,
                  bodyType,
                });
                requestCount++;
              }
            });
          };

          importItems(data.item, null);
          setSuccess(`Imported "${collectionName}" with ${requestCount} requests.`);
          setTimeout(onClose, 1500);
          return;
        }

        // Hantara native format
        if (data.name && (data.requests || data.folders)) {
          addCollection(data.name);
          setSuccess(`Imported "${data.name}".`);
          setTimeout(onClose, 1500);
          return;
        }

        setError("Unrecognized JSON format. Supported: Postman Collection v2.1 or Hantara format.");
      } else if (importType === "openapi") {
        // OpenAPI / Swagger import
        const result = parseOpenAPISpec(importText);
        if (!result) {
          setError("Could not parse OpenAPI/Swagger spec. Make sure it's valid JSON.");
          return;
        }

        addCollection(result.name);
        const collections = useCollectionStore.getState().collections;
        const newCol = collections[collections.length - 1];

        let requestCount = 0;

        // Add root requests
        for (const req of result.requests) {
          addRequest(newCol.id, null, req);
          requestCount++;
        }

        // Add folders with requests
        for (const folder of result.folders) {
          addFolder(newCol.id, null, folder.name);
          const updatedCollections = useCollectionStore.getState().collections;
          const updatedCol = updatedCollections.find((c) => c.id === newCol.id);
          const folders = updatedCol?.folders || [];
          const newFolder = folders[folders.length - 1];
          if (newFolder) {
            for (const req of folder.requests) {
              addRequest(newCol.id, newFolder.id, req);
              requestCount++;
            }
          }
        }

        setSuccess(`Imported "${result.name}" with ${requestCount} requests from OpenAPI spec.`);
        setTimeout(onClose, 1500);
      } else {
        // cURL import
        const parsed = parseCurl(importText.trim());
        if (parsed) {
          addCollection("Imported from cURL");
          const collections = useCollectionStore.getState().collections;
          const newCol = collections[collections.length - 1];
          addRequest(newCol.id, null, {
            name: `${parsed.method} ${new URL(parsed.url).pathname}`,
            method: parsed.method as any,
            url: parsed.url,
            headers: Object.entries(parsed.headers).map(([key, value]) => ({
              key,
              value,
              enabled: true,
            })),
            body: parsed.body || "",
            bodyType: parsed.body ? "raw" : "none",
          });
          setSuccess("Imported cURL command successfully.");
          setTimeout(onClose, 1500);
        } else {
          setError("Could not parse cURL command.");
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to parse import data.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Import Collection</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Import Type Selector */}
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setImportType("json")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
              importType === "json"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileJson size={12} /> JSON / Postman
          </button>
          <button
            type="button"
            onClick={() => setImportType("curl")}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              importType === "curl"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            cURL
          </button>
          <button
            type="button"
            onClick={() => setImportType("openapi")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
              importType === "openapi"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Globe2 size={12} /> OpenAPI / Swagger
          </button>
        </div>

        {/* File Upload */}
        {(importType === "json" || importType === "openapi") && (
          <div className="mb-3">
            <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-[var(--border)] px-4 py-3 hover:border-[var(--accent)]">
              <Upload size={16} className="text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)]">Drop a file or click to upload</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Text Area */}
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={
            importType === "json"
              ? "Or paste Postman collection JSON here..."
              : importType === "openapi"
              ? "Paste OpenAPI/Swagger JSON spec here..."
              : "Paste cURL command here...\ne.g. curl -X GET https://api.example.com/users -H 'Authorization: Bearer token'"
          }
          className="mb-3 h-48 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          spellCheck={false}
        />

        {/* Messages */}
        {error && <p className="mb-3 text-xs text-[var(--error)]">{error}</p>}
        {success && <p className="mb-3 text-xs text-[var(--success)]">{success}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

function findAllFolders(folders: any[]): any[] {
  const all: any[] = [];
  folders.forEach((f) => {
    all.push(f);
    all.push(...findAllFolders(f.folders || []));
  });
  return all;
}

function parseCurl(input: string): { method: string; url: string; headers: Record<string, string>; body?: string } | null {
  if (!input.toLowerCase().startsWith("curl")) return null;

  let method = "GET";
  let url = "";
  let body = "";
  const headers: Record<string, string> = {};

  // Extract method
  const methodMatch = input.match(/-X\s+(\w+)/i);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  // Extract URL
  const urlMatch = input.match(/(https?:\/\/[^\s"'\\]+)/);
  if (urlMatch) url = urlMatch[1];

  // Extract headers
  const headerMatches = input.matchAll(/-H\s+["']([^"']+)["']/gi);
  for (const match of headerMatches) {
    const [key, ...valueParts] = match[1].split(":");
    if (key) headers[key.trim()] = valueParts.join(":").trim();
  }

  // Extract body
  const bodyMatch = input.match(/(?:-d|--data|--data-raw)\s+["']([^"']+)["']/i);
  if (bodyMatch) {
    body = bodyMatch[1];
    if (!methodMatch) method = "POST";
  }

  if (!url) return null;

  return { method, url, headers, body: body || undefined };
}
