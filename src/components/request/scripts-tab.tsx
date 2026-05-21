"use client";

import { useState } from "react";

type ScriptType = "pre-request" | "post-response";

export function ScriptsTab() {
  const [activeScript, setActiveScript] = useState<ScriptType>("pre-request");
  const [preRequestScript, setPreRequestScript] = useState("");
  const [postResponseScript, setPostResponseScript] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Script Type Selector */}
      <div className="flex border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveScript("pre-request")}
          className={`px-4 py-2 text-xs ${
            activeScript === "pre-request"
              ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Pre-request Script
        </button>
        <button
          type="button"
          onClick={() => setActiveScript("post-response")}
          className={`px-4 py-2 text-xs ${
            activeScript === "post-response"
              ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Post-response Script
        </button>
      </div>

      {/* Script Editor */}
      <div className="flex-1 p-3">
        <div className="mb-2 text-xs text-[var(--text-secondary)]">
          {activeScript === "pre-request"
            ? "This script runs before the request is sent."
            : "This script runs after the response is received."}
        </div>
        <textarea
          value={activeScript === "pre-request" ? preRequestScript : postResponseScript}
          onChange={(e) =>
            activeScript === "pre-request"
              ? setPreRequestScript(e.target.value)
              : setPostResponseScript(e.target.value)
          }
          placeholder={
            activeScript === "pre-request"
              ? "// e.g. set variables, modify headers\nconsole.log('Pre-request script');"
              : "// e.g. run tests, extract values\nconsole.log('Post-response script');"
          }
          className="h-full min-h-[200px] w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
