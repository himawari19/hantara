"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";
import { generateCode, CodeLanguage, languageLabels } from "@/lib/code-generator";
import { X, Copy, Check } from "lucide-react";

interface CodeGeneratorDialogProps {
  onClose: () => void;
}

export function CodeGeneratorDialog({ onClose }: CodeGeneratorDialogProps) {
  const { method, url, headers, body, bodyType } = useRequestStore();
  const [language, setLanguage] = useState<CodeLanguage>("curl");
  const [copied, setCopied] = useState(false);

  const activeHeaders: Record<string, string> = {};
  headers
    .filter((h) => h.enabled && h.key.trim())
    .forEach((h) => {
      activeHeaders[h.key] = h.value;
    });

  const code = generateCode(
    { method, url, headers: activeHeaders, body, bodyType },
    language
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Code Snippet</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Language Selector */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(languageLabels) as CodeLanguage[]).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                language === lang
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {languageLabels[lang]}
            </button>
          ))}
        </div>

        {/* Code Output */}
        <div className="relative">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded bg-[var(--bg-secondary)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Copy code"
          >
            {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
          </button>
          <pre className="max-h-[400px] overflow-auto rounded-lg bg-[var(--bg-tertiary)] p-4 font-mono text-xs text-[var(--text-primary)]">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
}
