"use client";

import { useState, useMemo } from "react";
import { useRequestStore } from "@/store/request-store";
import { Table, BarChart3, List } from "lucide-react";

type ViewMode = "table" | "chart" | "list";

export function ResponseVisualizer() {
  const { response } = useRequestStore();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedPath, setSelectedPath] = useState("");

  const data = useMemo(() => {
    if (!response?.body) return null;
    try {
      const parsed = JSON.parse(response.body);
      // Find array data
      if (Array.isArray(parsed)) return parsed;
      // Look for common array patterns
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
      if (parsed.results && Array.isArray(parsed.results)) return parsed.results;
      if (parsed.items && Array.isArray(parsed.items)) return parsed.items;
      if (parsed.records && Array.isArray(parsed.records)) return parsed.records;
      // Return as single-item array for object responses
      if (typeof parsed === "object" && parsed !== null) return [parsed];
      return null;
    } catch {
      return null;
    }
  }, [response?.body]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">
          No array data found in response to visualize.
        </p>
      </div>
    );
  }

  // Get columns from first item
  const columns = Object.keys(data[0] || {}).filter(
    (key) => typeof data[0][key] !== "object" || data[0][key] === null
  );

  const numericColumns = columns.filter((col) =>
    data.every((item: any) => typeof item[col] === "number" || item[col] === null || item[col] === undefined)
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="text-xs text-[var(--text-secondary)]">
          {data.length} items • {columns.length} fields
        </span>
        <div className="ml-auto flex items-center gap-1">
          {([
            { mode: "table" as ViewMode, icon: Table, label: "Table" },
            { mode: "chart" as ViewMode, icon: BarChart3, label: "Chart" },
            { mode: "list" as ViewMode, icon: List, label: "List" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                viewMode === mode
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              title={label}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "table" && <TableView data={data} columns={columns} />}
        {viewMode === "chart" && <ChartView data={data} numericColumns={numericColumns} columns={columns} />}
        {viewMode === "list" && <ListView data={data} columns={columns} />}
      </div>
    </div>
  );
}

function TableView({ data, columns }: { data: any[]; columns: string[] }) {
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--bg-secondary)]">
          <tr>
            <th className="border-b border-[var(--border)] px-3 py-2 text-left text-[var(--text-secondary)]">#</th>
            {columns.map((col) => (
              <th key={col} className="border-b border-[var(--border)] px-3 py-2 text-left text-[var(--text-secondary)]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((item, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)]">
              <td className="border-b border-[var(--border)] px-3 py-1.5 text-[var(--text-secondary)]">{i + 1}</td>
              {columns.map((col) => (
                <td key={col} className="max-w-[200px] truncate border-b border-[var(--border)] px-3 py-1.5 text-[var(--text-primary)]">
                  {formatCellValue(item[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <p className="p-3 text-center text-xs text-[var(--text-secondary)]">
          Showing first 100 of {data.length} items
        </p>
      )}
    </div>
  );
}

function ChartView({ data, numericColumns, columns }: { data: any[]; numericColumns: string[]; columns: string[] }) {
  const [selectedCol, setSelectedCol] = useState(numericColumns[0] || "");

  if (numericColumns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">No numeric columns found for chart visualization.</p>
      </div>
    );
  }

  const values = data.map((item) => Number(item[selectedCol]) || 0);
  const maxValue = Math.max(...values, 1);
  const labelCol = columns.find((c) => c !== selectedCol && typeof data[0]?.[c] === "string") || "";

  return (
    <div className="flex h-full flex-col p-4">
      {/* Column Selector */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-xs text-[var(--text-secondary)]">Column:</label>
        <select
          value={selectedCol}
          onChange={(e) => setSelectedCol(e.target.value)}
          className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none"
          aria-label="Select column for chart"
        >
          {numericColumns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
      </div>

      {/* Bar Chart */}
      <div className="flex flex-1 items-end gap-1 overflow-x-auto pb-6">
        {values.slice(0, 50).map((value, i) => (
          <div key={i} className="flex min-w-[24px] flex-col items-center gap-1">
            <span className="text-[9px] text-[var(--text-secondary)]">{value}</span>
            <div
              className="w-5 rounded-t bg-[var(--accent)] transition-all hover:bg-[var(--accent-hover)]"
              style={{ height: `${Math.max((value / maxValue) * 200, 2)}px` }}
              title={`${labelCol ? data[i]?.[labelCol] + ": " : ""}${value}`}
            />
            {labelCol && (
              <span className="max-w-[40px] truncate text-[8px] text-[var(--text-secondary)]">
                {String(data[i]?.[labelCol] || i).slice(0, 5)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({ data, columns }: { data: any[]; columns: string[] }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {data.slice(0, 50).map((item, i) => (
        <div key={i} className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-3">
          <div className="mb-1 text-[10px] font-medium text-[var(--text-secondary)]">Item {i + 1}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {columns.map((col) => (
              <div key={col} className="flex gap-2 text-xs">
                <span className="text-[var(--info)]">{col}:</span>
                <span className="truncate text-[var(--text-primary)]">{formatCellValue(item[col])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
