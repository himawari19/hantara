"use client";

import { useRequestStore } from "@/store/request-store";
import { Trash2, Plus } from "lucide-react";

export function FormDataEditor() {
  const { formData, setFormData, bodyType } = useRequestStore();

  const updateField = (
    index: number,
    field: "key" | "value" | "type" | "enabled" | "description",
    value: string | boolean
  ) => {
    const newData = [...formData];
    newData[index] = { ...newData[index], [field]: value };

    // Auto-add empty row at end
    const last = newData[newData.length - 1];
    if (last.key.trim() || last.value.trim()) {
      newData.push({ key: "", value: "", type: "text", enabled: true });
    }

    setFormData(newData);
  };

  const removeField = (index: number) => {
    if (formData.length <= 1) return;
    setFormData(formData.filter((_, i) => i !== index));
  };

  const addField = () => {
    setFormData([...formData, { key: "", value: "", type: "text", enabled: true }]);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_1fr_80px_auto] items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span className="w-5"></span>
        <span>Key</span>
        <span>Value</span>
        {bodyType === "form-data" && <span>Type</span>}
        <span className="w-6"></span>
      </div>

      {/* Rows */}
      {formData.map((field, index) => (
        <div
          key={index}
          className={`grid items-center gap-2 ${
            bodyType === "form-data"
              ? "grid-cols-[auto_1fr_1fr_80px_auto]"
              : "grid-cols-[auto_1fr_1fr_auto]"
          }`}
        >
          <input
            type="checkbox"
            checked={field.enabled}
            onChange={(e) => updateField(index, "enabled", e.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
            aria-label={`Enable field ${field.key || index + 1}`}
          />
          <input
            type="text"
            value={field.key}
            onChange={(e) => updateField(index, "key", e.target.value)}
            placeholder="Key"
            className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          {field.type === "file" && bodyType === "form-data" ? (
            <input
              type="file"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-secondary)]"
              aria-label={`File for ${field.key || 'field'}`}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) updateField(index, "value", file.name);
              }}
            />
          ) : (
            <input
              type="text"
              value={field.value}
              onChange={(e) => updateField(index, "value", e.target.value)}
              placeholder="Value"
              className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
            />
          )}
          {bodyType === "form-data" && (
            <select
              value={field.type}
              onChange={(e) => updateField(index, "type", e.target.value)}
              className="rounded bg-[var(--bg-tertiary)] px-1 py-1.5 text-xs text-[var(--text-primary)] outline-none"
              aria-label="Field type"
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          )}
          <button
            type="button"
            onClick={() => removeField(index)}
            className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]"
            aria-label="Remove field"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {/* Add Button */}
      <button
        type="button"
        onClick={addField}
        className="mt-1 flex items-center gap-1 self-start rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
      >
        <Plus size={12} />
        Add Field
      </button>
    </div>
  );
}
