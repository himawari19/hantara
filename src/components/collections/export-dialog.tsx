"use client";

import { useState } from "react";
import { useCollectionStore } from "@/store/collection-store";
import { exportToPostman, exportToOpenAPI, exportToCurl, exportToFetch } from "@/lib/export";
import { Download, Copy, Check } from "lucide-react";

interface ExportDialogProps {
  collectionId?: string;
  requestId?: string;
  onClose: () => void;
}

type ExportFormat = "postman" | "openapi" | "curl" | "fetch";

export function ExportDialog({ collectionId, requestId, onClose }: ExportDialogProps) {
  const { collections } = useCollectionStore();
  const [format, setFormat] = useState<ExportFormat>("postman");
  const [copied, setCopied] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionId || collections[0]?.id || "");

  const collection = collections.find((c) => c.id === selectedCollectionId);

  // Find request if exporting single request
  const findRequest = () => {
    if (!requestId) return null;
    for (const col of collections) {
      const req = col.requests.find((r) => r.id === requestId);
      if (req) return req;
      for (const folder of col.folders) {
        const fReq = folder.requests.find((r) => r.id === requestId);
        if (fReq) return fReq;
      }
    }
    return null;
  };

  const request = findRequest();

  const getExportContent = (): string => {
    if (request && (format === "curl" || format === "fetch")) {
      return format === "curl" ? exportToCurl(request) : exportToFetch(request);
    }

    if (!collection) return "// No collection selected";

    switch (format) {
      case "postman":
        return exportToPostman(collection);
      case "openapi":
        return exportToOpenAPI(collection);
      case "curl":
        return collection.requests[0] ? exportToCurl(collection.requests[0]) : "// No requests";
      case "fetch":
        return collection.requests[0] ? exportToFetch(collection.requests[0]) : "// No requests";
      default:
        return "";
    }
  };

  const content = getExportContent();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensions: Record<ExportFormat, string> = {
      postman: ".postman_collection.json",
      openapi: ".openapi.json",
      curl: ".sh",
      fetch: ".js",
    };

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection?.name || "export"}${extensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Export</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Options */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          {/* Collection Selector */}
          {!requestId && (
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Select collection to export"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Format Selector */}
          <div className="flex gap-1">
            {(["postman", "openapi", "curl", "fetch"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded px-3 py-1.5 text-xs font-medium ${
                  format === f
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {f === "postman" ? "Postman" : f === "openapi" ? "OpenAPI" : f === "curl" ? "cURL" : "Fetch"}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1.5 text-xs text-white hover:bg-[var(--accent-hover)]"
            >
              <Download size={12} /> Download
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="max-h-[50vh] overflow-auto p-4">
          <pre className="whitespace-pre-wrap break-words rounded bg-[var(--bg-tertiary)] p-4 font-mono text-xs text-[var(--text-primary)]">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
