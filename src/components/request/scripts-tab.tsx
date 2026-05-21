"use client";

import { useState } from "react";
import { useRequestStore } from "@/store/request-store";
import { ChevronRight, Zap, Wand2 } from "lucide-react";
import { VisualTestBuilder } from "./visual-test-builder";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading editor...
    </div>
  ),
});

interface ScriptsTabProps {
  type: "pre-request" | "tests";
}

const TEST_SNIPPETS = [
  { name: "Status code is 200", code: `pm.test('Status code is 200', () => {\n  pm.expect(pm.response.status).to.equal(200);\n});\n` },
  { name: "Status code is 201", code: `pm.test('Status code is 201', () => {\n  pm.expect(pm.response.status).to.equal(201);\n});\n` },
  { name: "Status code is 404", code: `pm.test('Status code is 404', () => {\n  pm.expect(pm.response.status).to.equal(404);\n});\n` },
  { name: "Response time < 200ms", code: `pm.test('Response time is less than 200ms', () => {\n  pm.expect(pm.response.time).to.be.below(200);\n});\n` },
  { name: "Response time < 500ms", code: `pm.test('Response time is less than 500ms', () => {\n  pm.expect(pm.response.time).to.be.below(500);\n});\n` },
  { name: "Response body is JSON", code: `pm.test('Response is valid JSON', () => {\n  const json = pm.response.json();\n  pm.expect(json).to.exist;\n});\n` },
  { name: "Body contains string", code: `pm.test('Body contains expected string', () => {\n  const body = pm.response.text();\n  pm.expect(body).to.include('expected_string');\n});\n` },
  { name: "JSON has property", code: `pm.test('JSON has expected property', () => {\n  const json = pm.response.json();\n  pm.expect(json).to.have.property('key');\n});\n` },
  { name: "JSON value equals", code: `pm.test('JSON value equals expected', () => {\n  const json = pm.response.json();\n  pm.expect(json.key).to.equal('expected_value');\n});\n` },
  { name: "Response is array", code: `pm.test('Response is an array', () => {\n  const json = pm.response.json();\n  pm.expect(Array.isArray(json)).to.equal(true);\n});\n` },
  { name: "Array is not empty", code: `pm.test('Array is not empty', () => {\n  const json = pm.response.json();\n  pm.expect(json.length).to.be.above(0);\n});\n` },
  { name: "Set env variable from response", code: `pm.test('Extract and set variable', () => {\n  const json = pm.response.json();\n  pm.environment.set('token', json.token);\n});\n` },
  { name: "Set global variable", code: `pm.test('Set global variable', () => {\n  const json = pm.response.json();\n  pm.globals.set('userId', json.id);\n});\n` },
];

const PRE_REQUEST_SNIPPETS = [
  { name: "Set variable", code: `pm.variables.set('key', 'value');\n` },
  { name: "Get variable", code: `const value = pm.variables.get('key');\nconsole.log(value);\n` },
  { name: "Set timestamp", code: `pm.variables.set('timestamp', Date.now().toString());\n` },
  { name: "Set random UUID", code: `pm.variables.set('uuid', crypto.randomUUID());\n` },
  { name: "Set random number", code: `pm.variables.set('randomNum', Math.floor(Math.random() * 1000).toString());\n` },
  { name: "Set global variable", code: `pm.globals.set('key', 'value');\n` },
  { name: "Log variable", code: `console.log('Variable:', pm.variables.get('key'));\n` },
  { name: "Set auth token", code: `// Get token from environment and set as header\nconst token = pm.environment.get('authToken');\nconsole.log('Using token:', token ? 'present' : 'missing');\n` },
];

export function ScriptsTab({ type }: ScriptsTabProps) {
  const { preScript, testScript, setPreScript, setTestScript, scriptLogs, testResults, clearScriptLogs } =
    useRequestStore();
  const [showSnippets, setShowSnippets] = useState(true);
  const [showTestBuilder, setShowTestBuilder] = useState(false);

  const isPreRequest = type === "pre-request";
  const script = isPreRequest ? preScript : testScript;
  const setScript = isPreRequest ? setPreScript : setTestScript;
  const snippets = isPreRequest ? PRE_REQUEST_SNIPPETS : TEST_SNIPPETS;

  const insertSnippet = (code: string) => {
    const newScript = script ? script + "\n" + code : code;
    setScript(newScript);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Description */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          {isPreRequest
            ? "Runs before the request is sent. Use pm.variables.set(), pm.environment.set(), etc."
            : "Runs after the response is received. Use pm.test(), pm.expect(), pm.response.json(), etc."}
        </span>
        <div className="flex items-center gap-1">
          {!isPreRequest && (
            <button
              type="button"
              onClick={() => setShowTestBuilder(true)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
            >
              <Wand2 size={11} />
              Visual Builder
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSnippets(!showSnippets)}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)]"
          >
            <Zap size={11} />
            {showSnippets ? "Hide Snippets" : "Show Snippets"}
          </button>
        </div>
      </div>

      {/* Editor + Snippets side by side */}
      <div className="flex gap-3">
        {/* Monaco Editor */}
        <div className={`overflow-hidden rounded border border-[var(--border)] ${showSnippets ? "flex-1" : "w-full"}`}>
          <MonacoEditor
            height="220px"
            language="javascript"
            value={script}
            onChange={(value) => setScript(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              wordWrap: "on",
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 8 },
            }}
          />
        </div>

        {/* Snippets Panel */}
        {showSnippets && (
          <div className="w-56 flex-shrink-0 overflow-auto rounded border border-[var(--border)] bg-[var(--bg-tertiary)]">
            <div className="border-b border-[var(--border)] px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Snippets
              </span>
            </div>
            <div className="flex flex-col">
              {snippets.map((snippet, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertSnippet(snippet.code)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-left text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ChevronRight size={10} className="flex-shrink-0 text-[var(--accent)]" />
                  <span className="truncate">{snippet.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Script Output / Test Results */}
      {(scriptLogs.length > 0 || testResults.length > 0) && (
        <div className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Output
              {testResults.length > 0 && (
                <span className="ml-2 text-[var(--text-secondary)]">
                  ({testResults.filter((t) => t.passed).length}/{testResults.length} passed)
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={clearScriptLogs}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--error)]"
            >
              Clear
            </button>
          </div>
          {testResults.length > 0 && (
            <div className="mb-2 flex flex-col gap-1">
              {testResults.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                    result.passed ? "bg-green-900/20" : "bg-red-900/20"
                  }`}
                >
                  <span className={result.passed ? "text-[var(--success)]" : "text-[var(--error)]"}>
                    {result.passed ? "✓" : "✗"}
                  </span>
                  <span className="text-[var(--text-primary)]">{result.name}</span>
                  {result.error && (
                    <span className="ml-auto text-[var(--error)]">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {scriptLogs.length > 0 && (
            <div className="max-h-[100px] overflow-auto font-mono text-[10px] text-[var(--text-secondary)]">
              {scriptLogs.map((log, i) => (
                <div key={i} className={log.startsWith("[ERROR]") ? "text-[var(--error)]" : ""}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visual Test Builder Modal */}
      {showTestBuilder && (
        <VisualTestBuilder
          onInsert={insertSnippet}
          onClose={() => setShowTestBuilder(false)}
        />
      )}
    </div>
  );
}
