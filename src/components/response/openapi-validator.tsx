"use client";

import { useState, useEffect, useRef } from "react";
import { useOpenAPIStore, OpenAPISpec, ValidationResult } from "@/store/openapi-store";
import { useRequestStore } from "@/store/request-store";
import { useResponseStore } from "@/store/response-store";
import { Upload, Check, AlertTriangle, X, FileJson, Trash2, RefreshCw } from "lucide-react";

export function OpenAPIValidator() {
  const { specs, activeSpecId, importSpec, removeSpec, setActiveSpec, validateResponse } = useOpenAPIStore();
  const { response } = useResponseStore();
  const { method, url } = useRequestStore();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-validate when response changes
  useEffect(() => {
    if (response && activeSpecId) {
      const result = validateResponse(method, url, response.status, response.body);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [response, activeSpecId, method, url]);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        let parsed: any;
        if (file.name.endsWith(".yaml") || file.name.endsWith(".yml")) {
          // Basic YAML parsing (JSON subset)
          parsed = JSON.parse(content);
        } else {
          parsed = JSON.parse(content);
        }

        if (parsed.openapi || parsed.swagger) {
          const name = parsed.info?.title || file.name.replace(/\.(json|yaml|yml)$/, "");
          importSpec(name, parsed);
          setShowImport(false);
        } else {
          alert("Invalid OpenAPI/Swagger spec. Must contain 'openapi' or 'swagger' field.");
        }
      } catch {
        alert("Failed to parse file. Ensure it's valid JSON.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRevalidate = () => {
    if (response && activeSpecId) {
      const result = validateResponse(method, url, response.status, response.body);
      setValidationResult(result);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Spec Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-primary)]">OpenAPI Validation</span>
        <div className="ml-auto flex items-center gap-1">
          {activeSpecId && response && (
            <button
              type="button"
              onClick={handleRevalidate}
              className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              title="Re-validate"
              aria-label="Re-validate"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Upload size={10} /> Import Spec
          </button>
        </div>
      </div>

      {/* Spec List */}
      {specs.length > 0 && (
        <div className="flex flex-col gap-1">
          {specs.map((spec) => (
            <div
              key={spec.id}
              className={`flex items-center gap-2 rounded border px-2.5 py-1.5 ${
                activeSpecId === spec.id
                  ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
                  : "border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <FileJson size={12} className={activeSpecId === spec.id ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"} />
              <button
                type="button"
                onClick={() => setActiveSpec(spec.id === activeSpecId ? null : spec.id)}
                className="flex flex-1 flex-col text-left"
              >
                <span className="text-xs text-[var(--text-primary)]">{spec.name}</span>
                <span className="text-[9px] text-[var(--text-secondary)]">
                  v{spec.version} • {spec.endpoints.length} endpoints
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeSpec(spec.id)}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]"
                aria-label="Remove spec"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No spec */}
      {specs.length === 0 && (
        <div className="rounded border border-dashed border-[var(--border)] p-4 text-center">
          <FileJson size={20} className="mx-auto mb-2 text-[var(--text-secondary)] opacity-40" />
          <p className="text-xs text-[var(--text-secondary)]">No OpenAPI spec imported</p>
          <p className="mt-1 text-[10px] text-[var(--text-secondary)] opacity-60">
            Import a Swagger/OpenAPI JSON file to auto-validate responses
          </p>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && response && (
        <div className={`rounded border p-3 ${
          validationResult.valid
            ? "border-green-600/30 bg-green-900/10"
            : "border-red-600/30 bg-red-900/10"
        }`}>
          <div className="flex items-center gap-2">
            {validationResult.valid ? (
              <>
                <Check size={14} className="text-[var(--success)]" />
                <span className="text-xs font-medium text-[var(--success)]">
                  Response matches spec
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-[var(--error)]" />
                <span className="text-xs font-medium text-[var(--error)]">
                  {validationResult.errors.length} validation error{validationResult.errors.length > 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          {validationResult.endpoint && (
            <div className="mt-1.5 text-[10px] text-[var(--text-secondary)]">
              Matched: <code className="text-[var(--accent)]">{validationResult.endpoint.method} {validationResult.endpoint.path}</code>
              {validationResult.endpoint.summary && (
                <span className="ml-1">— {validationResult.endpoint.summary}</span>
              )}
            </div>
          )}

          {!validationResult.endpoint && !validationResult.valid && validationResult.errors.length === 0 && (
            <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
              No matching endpoint found in spec for {method} {url}
            </p>
          )}

          {validationResult.errors.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {validationResult.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1.5">
                  <X size={10} className="mt-0.5 shrink-0 text-[var(--error)]" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-primary)]">{err.message}</span>
                    <span className="font-mono text-[9px] text-[var(--text-secondary)]">
                      at <code>{err.path}</code>
                      {err.expected && <> • expected: <code className="text-green-400">{err.expected}</code></>}
                      {err.actual && <> • got: <code className="text-red-400">{err.actual}</code></>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No response yet */}
      {!response && activeSpecId && (
        <p className="text-center text-[10px] text-[var(--text-secondary)]">
          Send a request to validate the response against the spec
        </p>
      )}

      {/* Import Dialog */}
      {showImport && (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-primary)]">Import OpenAPI Spec</span>
            <button type="button" onClick={() => setShowImport(false)} className="text-[var(--text-secondary)]" aria-label="Cancel">
              <X size={12} />
            </button>
          </div>
          <p className="mb-2 text-[10px] text-[var(--text-secondary)]">
            Supports OpenAPI 3.x and Swagger 2.0 in JSON format
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[var(--border)] py-3 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            <Upload size={14} /> Choose JSON file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileImport}
            className="hidden"
            aria-label="Import OpenAPI spec file"
          />
        </div>
      )}
    </div>
  );
}
