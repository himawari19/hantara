"use client";

import { useState } from "react";
import { useCollectionStore } from "@/store/collection-store";

interface ImportDialogProps {
  onClose: () => void;
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const { addCollection, addRequest } = useCollectionStore();
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importType, setImportType] = useState<"json" | "curl">("json");

  const handleImport = () => {
    setError(null);

    if (!importText.trim()) {
      setError("Please paste your collection data or cURL command.");
      return;
    }

    try {
      if (importType === "json") {
        const data = JSON.parse(importText);

        // Support basic Postman collection format
        if (data.info && data.item) {
          const collectionName = data.info.name || "Imported Collection";
          addCollection(collectionName);
          // Basic import - just creates the collection
          onClose();
          return;
        }

        // Simple format: { name, requests: [...] }
        if (data.name) {
          addCollection(data.name);
          onClose();
          return;
        }

        setError("Unrecognized JSON format. Supported: Postman Collection v2.1");
      } else {
        // cURL import
        const parsed = parseCurl(importText.trim());
        if (parsed) {
          addCollection("Imported from cURL");
          onClose();
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
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Import Type Selector */}
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setImportType("json")}
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              importType === "json"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            JSON / Postman
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
        </div>

        {/* Text Area */}
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={
            importType === "json"
              ? 'Paste Postman collection JSON here...'
              : 'Paste cURL command here...\ne.g. curl -X GET https://api.example.com/users'
          }
          className="mb-3 h-48 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          spellCheck={false}
        />

        {/* Error */}
        {error && (
          <p className="mb-3 text-xs text-[var(--error)]">{error}</p>
        )}

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

function parseCurl(input: string): { method: string; url: string; headers: Record<string, string> } | null {
  if (!input.startsWith("curl")) return null;

  let method = "GET";
  let url = "";
  const headers: Record<string, string> = {};

  // Extract method
  const methodMatch = input.match(/-X\s+(\w+)/);
  if (methodMatch) method = methodMatch[1].toUpperCase();

  // Extract URL (first quoted or unquoted URL-like string after curl)
  const urlMatch = input.match(/(?:curl\s+(?:.*?\s+)?)(["']?)(https?:\/\/[^\s"']+)\1/);
  if (urlMatch) {
    url = urlMatch[2];
  } else {
    // Try to find any URL
    const simpleUrl = input.match(/(https?:\/\/[^\s"']+)/);
    if (simpleUrl) url = simpleUrl[1];
  }

  // Extract headers
  const headerMatches = input.matchAll(/-H\s+["']([^"']+)["']/g);
  for (const match of headerMatches) {
    const [key, ...valueParts] = match[1].split(":");
    if (key) headers[key.trim()] = valueParts.join(":").trim();
  }

  if (!url) return null;

  // If has body data, default to POST
  if (input.includes("-d ") || input.includes("--data")) {
    if (!methodMatch) method = "POST";
  }

  return { method, url, headers };
}
