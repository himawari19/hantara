"use client";

import { useState } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { X, FileText, Copy, Check, Download } from "lucide-react";

interface DocsGeneratorProps {
  onClose: () => void;
}

export function DocsGenerator({ onClose }: DocsGeneratorProps) {
  const { collections } = useCollectionStore();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || "");
  const [copied, setCopied] = useState(false);

  const selectedCollection = collections.find((c) => c.id === selectedCollectionId);
  const markdown = selectedCollection ? generateMarkdown(selectedCollection) : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCollection?.name || "api"}-docs.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">API Documentation Generator</h2>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close"><X size={18} /></button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2">
          <label className="text-xs text-[var(--text-secondary)]">Collection:</label>
          <select value={selectedCollectionId} onChange={(e) => setSelectedCollectionId(e.target.value)}
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none" aria-label="Select collection">
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={handleCopy}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
              {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={handleDownload}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
              <Download size={12} /> Download .md
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5">
          <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--text-primary)] leading-relaxed">{markdown}</pre>
        </div>
      </div>
    </div>
  );
}

function generateMarkdown(collection: Collection): string {
  let md = `# ${collection.name}\n\n`;
  md += `> Auto-generated API documentation\n\n`;
  md += `---\n\n`;

  // Root requests
  for (const req of collection.requests) {
    md += formatRequest(req);
  }

  // Folders
  for (const folder of collection.folders) {
    md += formatFolder(folder, 2);
  }

  return md;
}

function formatFolder(folder: Folder, headingLevel: number): string {
  const heading = "#".repeat(headingLevel);
  let md = `${heading} ${folder.name}\n\n`;

  for (const req of folder.requests) {
    md += formatRequest(req);
  }

  for (const sub of folder.folders) {
    md += formatFolder(sub, Math.min(headingLevel + 1, 6));
  }

  return md;
}

function formatRequest(req: RequestItem): string {
  const methodBadge = `\`${req.method}\``;
  let md = `### ${methodBadge} ${req.name}\n\n`;
  md += `**URL:** \`${req.url || "(no URL)"}\`\n\n`;

  // Headers
  const activeHeaders = req.headers.filter((h) => h.enabled && h.key.trim());
  if (activeHeaders.length > 0) {
    md += `**Headers:**\n\n`;
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const h of activeHeaders) {
      md += `| ${h.key} | ${h.value} |\n`;
    }
    md += `\n`;
  }

  // Params
  const activeParams = req.params?.filter((p) => p.enabled && p.key.trim()) || [];
  if (activeParams.length > 0) {
    md += `**Query Parameters:**\n\n`;
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const p of activeParams) {
      md += `| ${p.key} | ${p.value} |\n`;
    }
    md += `\n`;
  }

  // Body
  if (req.bodyType !== "none" && req.body.trim()) {
    md += `**Body** (${req.bodyType}):\n\n`;
    md += "```json\n" + req.body + "\n```\n\n";
  }

  // Auth
  if (req.authType !== "none") {
    md += `**Auth:** ${req.authType}\n\n`;
  }

  md += `---\n\n`;
  return md;
}
