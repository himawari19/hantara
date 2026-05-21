"use client";

import { useState } from "react";
import { useResponseStore } from "@/store/response-store";
import { validateJsonSchema, generateSchemaFromSample } from "@/lib/schema-validator";
import { Check, AlertTriangle, Wand2 } from "lucide-react";

export function SchemaValidator() {
  const { response } = useResponseStore();
  const [schema, setSchema] = useState("");
  const [result, setResult] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const handleValidate = () => {
    if (!response) return;

    try {
      const parsedSchema = JSON.parse(schema);
      const responseData = JSON.parse(response.body);
      const validationResult = validateJsonSchema(responseData, parsedSchema);
      setResult(validationResult);
    } catch (err: any) {
      setResult({ valid: false, errors: [`Parse error: ${err.message}`] });
    }
  };

  const handleGenerateSchema = () => {
    if (!response) return;

    try {
      const responseData = JSON.parse(response.body);
      const generated = generateSchemaFromSample(responseData);
      setSchema(JSON.stringify(generated, null, 2));
    } catch {
      setSchema('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-primary)]">JSON Schema Validation</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleGenerateSchema}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Generate schema from current response"
          >
            <Wand2 size={10} /> Generate from Response
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={!response || !schema.trim()}
            className="rounded bg-[var(--accent)] px-3 py-1 text-[10px] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            Validate
          </button>
        </div>
      </div>

      <textarea
        value={schema}
        onChange={(e) => setSchema(e.target.value)}
        placeholder={'{\n  "type": "object",\n  "required": ["id", "name"],\n  "properties": {\n    "id": { "type": "integer" },\n    "name": { "type": "string" }\n  }\n}'}
        className="h-32 w-full resize-none rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        spellCheck={false}
      />

      {/* Results */}
      {result && (
        <div className={`rounded border p-3 ${
          result.valid
            ? "border-green-600/30 bg-green-900/10"
            : "border-red-600/30 bg-red-900/10"
        }`}>
          <div className="flex items-center gap-2">
            {result.valid ? (
              <>
                <Check size={14} className="text-[var(--success)]" />
                <span className="text-xs font-medium text-[var(--success)]">Valid - Response matches schema</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-[var(--error)]" />
                <span className="text-xs font-medium text-[var(--error)]">
                  Invalid - {result.errors.length} error(s)
                </span>
              </>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {result.errors.map((err, i) => (
                <p key={i} className="text-[10px] text-[var(--error)]">• {err}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
