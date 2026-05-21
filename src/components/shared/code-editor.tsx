"use client";

import dynamic from "next/dynamic";
import { ComponentProps } from "react";

/**
 * Shared Monaco Editor wrapper with error handling fallback.
 * If Monaco fails to load (chunk error), falls back to a plain <pre> element.
 */
const MonacoEditorInner = dynamic(
  () =>
    import("@monaco-editor/react")
      .then((m) => m.default)
      .catch(() => {
        // Return a fallback component if Monaco fails to load
        return function FallbackEditor(props: any) {
          return (
            <div className="h-full overflow-auto">
              <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs text-[var(--text-primary)]">
                {props.value || ""}
              </pre>
            </div>
          );
        };
      }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
        Loading editor...
      </div>
    ),
  }
);

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  options?: Record<string, any>;
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  height = "100%",
  options = {},
}: CodeEditorProps) {
  return (
    <MonacoEditorInner
      height={height}
      language={language}
      value={value}
      onChange={(val: string | undefined) => onChange?.(val || "")}
      theme="light"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 12,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        padding: { top: 8 },
        ...options,
      }}
    />
  );
}
