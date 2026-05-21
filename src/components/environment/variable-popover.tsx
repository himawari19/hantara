"use client";

import { useState, useRef, useEffect } from "react";
import { useEnvironmentStore } from "@/store/environment-store";
import { Edit3, Check, X } from "lucide-react";

interface VariablePopoverProps {
  variableName: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function VariablePopover({ variableName, position, onClose }: VariablePopoverProps) {
  const { getVariable, setVariable, getResolvedVariables, environments, activeEnvironmentId } = useEnvironmentStore();
  const currentValue = getVariable(variableName) || "";
  const [editValue, setEditValue] = useState(currentValue);
  const [isEditing, setIsEditing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const resolved = variableName in getResolvedVariables();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleSave = () => {
    setVariable(variableName, editValue);
    setIsEditing(false);
  };

  // Adjust position to stay within viewport
  const adjustedX = Math.min(position.x, window.innerWidth - 300);
  const adjustedY = position.y + 24;

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-72 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${resolved ? "bg-green-400" : "bg-red-400"}`} />
          <code className="text-xs font-medium text-[var(--text-primary)]">{`{{${variableName}}}`}</code>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Environment info */}
        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
          <span>Environment: {activeEnv?.name || "None"}</span>
          <span className={resolved ? "text-green-400" : "text-red-400"}>
            {resolved ? "Resolved" : "Unresolved"}
          </span>
        </div>

        {/* Current Value */}
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded bg-[var(--bg-tertiary)] px-2.5 py-1.5">
              <span className="text-xs text-[var(--text-primary)]">
                {currentValue || <span className="italic text-[var(--text-secondary)]">empty</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setIsEditing(true); setEditValue(currentValue); }}
              className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
              title="Edit value"
              aria-label="Edit variable value"
            >
              <Edit3 size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
              className="flex-1 rounded bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
              autoFocus
              aria-label="Variable value"
            />
            <button
              type="button"
              onClick={handleSave}
              className="rounded p-1.5 text-green-400 hover:bg-[var(--bg-tertiary)]"
              aria-label="Save"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Hint */}
        {!activeEnv && (
          <p className="text-[10px] text-[var(--warning)]">
            No active environment. Select one to resolve variables.
          </p>
        )}
      </div>
    </div>
  );
}
