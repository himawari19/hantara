"use client";

import { useState, useMemo } from "react";
import { useRequestStore, ResponseData, HistoryItem } from "@/store/request-store";
import { X, ArrowLeftRight } from "lucide-react";

interface ResponseDiffProps {
  onClose: () => void;
  currentResponse: ResponseData;
}

export function ResponseDiff({ onClose, currentResponse }: ResponseDiffProps) {
  const { history } = useRequestStore();
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [compareBody, setCompareBody] = useState<string>("");

  // When user selects a history item, we don't have the full body stored in history
  // So we'll compare with a manually pasted response or the current one
  const [mode, setMode] = useState<"paste" | "current">("paste");
  const [pastedResponse, setPastedResponse] = useState("");

  const diffLines = useMemo(() => {
    const left = mode === "paste" ? pastedResponse : "";
    const right = currentResponse.body;
    if (!left && !right) return [];
    return computeSimpleDiff(left, right);
  }, [pastedResponse, currentResponse.body, mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Compare Responses</h2>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-2">
          <span className="text-xs text-[var(--text-secondary)]">Compare current response with:</span>
          <button type="button" onClick={() => setMode("paste")}
            className={`rounded px-2 py-1 text-xs ${mode === "paste" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"}`}>
            Pasted Text
          </button>
        </div>

        {/* Diff Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Paste area or previous response */}
          <div className="flex w-1/2 flex-col border-r border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Previous / Reference
              </span>
            </div>
            <textarea
              value={pastedResponse}
              onChange={(e) => setPastedResponse(e.target.value)}
              placeholder="Paste a previous response here to compare..."
              className="flex-1 resize-none bg-[var(--bg-primary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          </div>

          {/* Right: Current response */}
          <div className="flex w-1/2 flex-col">
            <div className="border-b border-[var(--border)] px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Current Response
              </span>
            </div>
            <div className="flex-1 overflow-auto bg-[var(--bg-primary)] p-3 font-mono text-xs">
              <pre className="whitespace-pre-wrap text-[var(--text-primary)]">{currentResponse.body}</pre>
            </div>
          </div>
        </div>

        {/* Diff Result */}
        {pastedResponse && (
          <div className="max-h-[200px] overflow-auto border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Diff Result ({diffLines.filter((l) => l.type === "added").length} added, {diffLines.filter((l) => l.type === "removed").length} removed)
            </div>
            <div className="font-mono text-xs">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-2 ${
                    line.type === "added" ? "bg-green-900/20 text-green-400" :
                    line.type === "removed" ? "bg-red-900/20 text-red-400" :
                    "text-[var(--text-secondary)]"
                  }`}
                >
                  <span className="mr-2 inline-block w-4 text-right opacity-50">
                    {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                  </span>
                  {line.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple line-by-line diff
function computeSimpleDiff(left: string, right: string): { type: "added" | "removed" | "same"; text: string }[] {
  const leftLines = left.split("\n");
  const rightLines = right.split("\n");
  const result: { type: "added" | "removed" | "same"; text: string }[] = [];

  const maxLen = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i];
    const r = rightLines[i];
    if (l === undefined && r !== undefined) {
      result.push({ type: "added", text: r });
    } else if (r === undefined && l !== undefined) {
      result.push({ type: "removed", text: l });
    } else if (l === r) {
      result.push({ type: "same", text: l });
    } else {
      result.push({ type: "removed", text: l });
      result.push({ type: "added", text: r });
    }
  }
  return result;
}
