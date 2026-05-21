"use client";

import { useRequestStore } from "@/store/request-store";

export function BodyEditor() {
  const { body, bodyType, setBody, setBodyType } = useRequestStore();

  return (
    <div className="flex flex-col gap-3">
      {/* Body Type Selector */}
      <div className="flex items-center gap-3">
        {(["none", "json", "raw", "form-data"] as const).map((type) => (
          <label key={type} className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="bodyType"
              value={type}
              checked={bodyType === type}
              onChange={() => setBodyType(type)}
              className="accent-[var(--accent)]"
            />
            <span className="text-[var(--text-secondary)]">
              {type === "none"
                ? "None"
                : type === "json"
                ? "JSON"
                : type === "form-data"
                ? "Form Data"
                : "Raw"}
            </span>
          </label>
        ))}
      </div>

      {/* Body Input */}
      {bodyType !== "none" && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            bodyType === "json"
              ? '{\n  "key": "value"\n}'
              : "Enter request body..."
          }
          className="min-h-[200px] w-full resize-y rounded bg-[var(--bg-tertiary)] p-3 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          spellCheck={false}
        />
      )}

      {bodyType === "none" && (
        <p className="text-sm text-[var(--text-secondary)]">
          This request does not have a body.
        </p>
      )}
    </div>
  );
}
