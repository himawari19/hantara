"use client";

import { useState } from "react";
import { Plus, Trash2, Wand2, X } from "lucide-react";

interface TestAssertion {
  id: string;
  source: "status" | "responseTime" | "body" | "header" | "jsonPath";
  operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan" | "exists" | "isType";
  target: string;
  value: string;
}

interface VisualTestBuilderProps {
  onInsert: (code: string) => void;
  onClose: () => void;
}

export function VisualTestBuilder({ onInsert, onClose }: VisualTestBuilderProps) {
  const [assertions, setAssertions] = useState<TestAssertion[]>([
    { id: crypto.randomUUID(), source: "status", operator: "equals", target: "", value: "200" },
  ]);
  const [testName, setTestName] = useState("API Response Validation");

  const addAssertion = () => {
    setAssertions([
      ...assertions,
      { id: crypto.randomUUID(), source: "status", operator: "equals", target: "", value: "" },
    ]);
  };

  const removeAssertion = (id: string) => {
    setAssertions(assertions.filter((a) => a.id !== id));
  };

  const updateAssertion = (id: string, data: Partial<TestAssertion>) => {
    setAssertions(assertions.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const generateCode = (): string => {
    const lines: string[] = [];

    for (const assertion of assertions) {
      const name = getAssertionName(assertion);
      const code = getAssertionCode(assertion);
      lines.push(`pm.test('${name}', () => {`);
      lines.push(`  ${code}`);
      lines.push(`});\n`);
    }

    return lines.join("\n");
  };

  const handleInsert = () => {
    const code = generateCode();
    onInsert(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Wand2 size={16} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Visual Test Builder</h3>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Test Name */}
        <div className="border-b border-[var(--border)] px-5 py-3">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Test Suite Name
          </label>
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            className="w-full rounded bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        {/* Assertions */}
        <div className="max-h-[400px] overflow-auto px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Assertions ({assertions.length})
            </span>
            <button
              type="button"
              onClick={addAssertion}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
            >
              <Plus size={10} /> Add
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {assertions.map((assertion, idx) => (
              <div
                key={assertion.id}
                className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-2"
              >
                <span className="min-w-[20px] text-center text-[10px] text-[var(--text-secondary)]">{idx + 1}</span>

                {/* Source */}
                <select
                  value={assertion.source}
                  onChange={(e) => updateAssertion(assertion.id, { source: e.target.value as TestAssertion["source"] })}
                  className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none"
                  aria-label="Assertion source"
                >
                  <option value="status">Status Code</option>
                  <option value="responseTime">Response Time</option>
                  <option value="body">Response Body</option>
                  <option value="header">Header</option>
                  <option value="jsonPath">JSON Path</option>
                </select>

                {/* Target (for header/jsonPath) */}
                {(assertion.source === "header" || assertion.source === "jsonPath") && (
                  <input
                    type="text"
                    value={assertion.target}
                    onChange={(e) => updateAssertion(assertion.id, { target: e.target.value })}
                    placeholder={assertion.source === "header" ? "Header name" : "$.data.id"}
                    className="w-28 rounded bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)]"
                  />
                )}

                {/* Operator */}
                <select
                  value={assertion.operator}
                  onChange={(e) => updateAssertion(assertion.id, { operator: e.target.value as TestAssertion["operator"] })}
                  className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none"
                  aria-label="Assertion operator"
                >
                  <option value="equals">equals</option>
                  <option value="notEquals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="greaterThan">greater than</option>
                  <option value="lessThan">less than</option>
                  <option value="exists">exists</option>
                  <option value="isType">is type</option>
                </select>

                {/* Value */}
                {assertion.operator !== "exists" && (
                  <input
                    type="text"
                    value={assertion.value}
                    onChange={(e) => updateAssertion(assertion.id, { value: e.target.value })}
                    placeholder="Expected value"
                    className="flex-1 rounded bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none placeholder-[var(--text-secondary)]"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeAssertion(assertion.id)}
                  className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                  aria-label="Remove assertion"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border-t border-[var(--border)] px-5 py-3">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Generated Code Preview
          </span>
          <pre className="max-h-[120px] overflow-auto rounded bg-[var(--bg-primary)] p-3 font-mono text-[10px] text-[var(--text-primary)]">
            {generateCode()}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="rounded bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)]"
          >
            Insert Tests
          </button>
        </div>
      </div>
    </div>
  );
}

function getAssertionName(assertion: TestAssertion): string {
  switch (assertion.source) {
    case "status":
      return `Status code ${assertion.operator === "equals" ? "is" : assertion.operator} ${assertion.value}`;
    case "responseTime":
      return `Response time ${assertion.operator === "lessThan" ? "is less than" : assertion.operator} ${assertion.value}ms`;
    case "body":
      return `Response body ${assertion.operator} ${assertion.value}`;
    case "header":
      return `Header "${assertion.target}" ${assertion.operator} ${assertion.value}`;
    case "jsonPath":
      return `JSON ${assertion.target} ${assertion.operator} ${assertion.value}`;
    default:
      return "Assertion";
  }
}

function getAssertionCode(assertion: TestAssertion): string {
  const { source, operator, target, value } = assertion;

  let subject = "";
  switch (source) {
    case "status":
      subject = "pm.response.status";
      break;
    case "responseTime":
      subject = "pm.response.time";
      break;
    case "body":
      subject = "pm.response.text()";
      break;
    case "header":
      subject = `pm.response.headers['${target.toLowerCase()}']`;
      break;
    case "jsonPath": {
      const path = target.startsWith("$.") ? target.slice(2) : target;
      subject = `pm.response.json().${path}`;
      break;
    }
  }

  switch (operator) {
    case "equals":
      return `pm.expect(${subject}).to.equal(${isNumeric(value) ? value : `'${value}'`});`;
    case "notEquals":
      return `pm.expect(${subject}).to.not.equal(${isNumeric(value) ? value : `'${value}'`});`;
    case "contains":
      return `pm.expect(${subject}).to.include('${value}');`;
    case "greaterThan":
      return `pm.expect(${subject}).to.be.above(${value});`;
    case "lessThan":
      return `pm.expect(${subject}).to.be.below(${value});`;
    case "exists":
      return `pm.expect(${subject}).to.exist;`;
    case "isType":
      return `pm.expect(typeof ${subject}).to.equal('${value}');`;
    default:
      return "";
  }
}

function isNumeric(value: string): boolean {
  return !isNaN(Number(value)) && value.trim() !== "";
}
