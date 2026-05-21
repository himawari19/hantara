"use client";

import { useRequestStore } from "@/store/request-store";
import dynamic from "next/dynamic";
import { FormDataEditor } from "./form-data-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading editor...
    </div>
  ),
});

export function BodyEditor() {
  const { body, bodyType, setBody, setBodyType } = useRequestStore();

  const bodyTypes = [
    { key: "none", label: "None" },
    { key: "json", label: "JSON" },
    { key: "form-data", label: "Form Data" },
    { key: "x-www-form-urlencoded", label: "x-www-form-urlencoded" },
    { key: "raw", label: "Raw" },
    { key: "binary", label: "Binary" },
    { key: "graphql", label: "GraphQL" },
  ] as const;

  const getMonacoLanguage = () => {
    switch (bodyType) {
      case "json":
        return "json";
      case "graphql":
        return "graphql";
      case "raw":
        return "plaintext";
      default:
        return "plaintext";
    }
  };

  const handleFormat = () => {
    if (bodyType === "json") {
      try {
        const formatted = JSON.stringify(JSON.parse(body), null, 2);
        setBody(formatted);
      } catch {
        // Invalid JSON, skip
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Body Type Selector */}
      <div className="flex items-center gap-1 flex-wrap">
        {bodyTypes.map((type) => (
          <button
            key={type.key}
            type="button"
            onClick={() => setBodyType(type.key)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              bodyType === type.key
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {type.label}
          </button>
        ))}

        {/* Format button for JSON */}
        {bodyType === "json" && (
          <button
            type="button"
            onClick={handleFormat}
            className="ml-auto rounded px-2 py-1 text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
            title="Format JSON (Ctrl+Shift+F)"
          >
            Beautify
          </button>
        )}
      </div>

      {/* Body Input */}
      {bodyType === "none" && (
        <p className="text-sm text-[var(--text-secondary)]">
          This request does not have a body.
        </p>
      )}

      {(bodyType === "json" || bodyType === "raw" || bodyType === "graphql") && (
        <div className="h-[250px] overflow-hidden rounded border border-[var(--border)]">
          <MonacoEditor
            height="250px"
            language={getMonacoLanguage()}
            value={body}
            onChange={(value) => setBody(value || "")}
            theme="light"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        </div>
      )}

      {(bodyType === "form-data" || bodyType === "x-www-form-urlencoded") && (
        <FormDataEditor />
      )}

      {bodyType === "binary" && (
        <div className="flex flex-col items-center gap-3 rounded border border-dashed border-[var(--border)] p-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="text-sm text-[var(--text-secondary)]">
            Select a file to upload as binary body
          </p>
          <input
            type="file"
            className="text-xs text-[var(--text-secondary)]"
            aria-label="Select file for binary body"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setBody(reader.result as string);
                reader.readAsText(file);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
