"use client";

import { useState, useRef, useEffect } from "react";
import { useEnvironmentStore, EnvironmentVariable } from "@/store/environment-store";
import { Settings, Plus, X, Trash2, Eye, Copy, Download, Upload, Globe, ChevronDown } from "lucide-react";

export function EnvironmentSelector() {
  const { environments, activeEnvironmentId, setActiveEnvironment, addEnvironment } = useEnvironmentStore();
  const [showManager, setShowManager] = useState(false);
  const [showQuickLook, setShowQuickLook] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="relative flex items-center gap-1">
      {/* Environment Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
          aria-label="Select environment"
        >
          <Globe size={12} className="text-[var(--text-secondary)]" />
          <span className="max-w-[120px] truncate">{activeEnv ? activeEnv.name : "No Environment"}</span>
          <ChevronDown size={12} className="text-[var(--text-secondary)]" />
        </button>
        {showDropdown && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg">
            <button type="button" onClick={() => { setActiveEnvironment(null); setShowDropdown(false); }}
              className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] ${!activeEnvironmentId ? "text-[var(--accent)] font-medium" : "text-[var(--text-primary)]"}`}>
              No Environment
            </button>
            <div className="my-1 border-t border-[var(--border)]" />
            {environments.map((env) => (
              <button key={env.id} type="button" onClick={() => { setActiveEnvironment(env.id); setShowDropdown(false); }}
                className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] ${activeEnvironmentId === env.id ? "text-[var(--accent)] font-medium" : "text-[var(--text-primary)]"}`}>
                <span className="truncate">{env.name}</span>
                {activeEnvironmentId === env.id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--success)]" />}
              </button>
            ))}
            {environments.length > 0 && <div className="my-1 border-t border-[var(--border)]" />}
            <button type="button" onClick={() => { addEnvironment("New Environment"); setShowDropdown(false); }}
              className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
              <Plus size={12} /> Add Environment
            </button>
          </div>
        )}
      </div>
      {/* Quick Look */}
      <button type="button" onClick={() => setShowQuickLook(!showQuickLook)}
        className={`rounded p-1 transition-colors ${showQuickLook ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"}`}
        aria-label="Environment quick look" title="Environment Quick Look">
        <Eye size={14} />
      </button>
      {/* Manage */}
      <button type="button" onClick={() => setShowManager(true)}
        className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        aria-label="Manage environments" title="Manage Environments">
        <Settings size={14} />
      </button>
      {showQuickLook && <QuickLookPanel onClose={() => setShowQuickLook(false)} />}
      {showManager && <EnvironmentManager onClose={() => setShowManager(false)} />}
    </div>
  );
}

function QuickLookPanel({ onClose }: { onClose: () => void }) {
  const { environments, activeEnvironmentId, globals, getResolvedVariables } = useEnvironmentStore();
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const resolved = getResolvedVariables();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) { onClose(); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const activeGlobals = globals.filter((v) => v.enabled && v.key.trim());
  const activeVars = activeEnv?.variables.filter((v) => v.enabled && v.key.trim()) || [];

  return (
    <div ref={panelRef} className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl">
      <div className="border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-xs font-bold text-[var(--text-primary)]">Environment Quick Look</h3>
        <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">{activeEnv ? activeEnv.name : "No environment selected"}</p>
      </div>
      <div className="max-h-[300px] overflow-auto p-3">
        {activeVars.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Environment: {activeEnv?.name}</p>
            <div className="space-y-1">
              {activeVars.map((v, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1">
                  <span className="text-[11px] font-medium text-[var(--accent)]">{v.key}</span>
                  <span className="ml-auto text-[11px] text-[var(--text-secondary)] truncate max-w-[180px]">
                    {v.type === "secret" ? "••••••••" : (v.currentValue || v.initialValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeGlobals.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Globals</p>
            <div className="space-y-1">
              {activeGlobals.map((v, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-[var(--bg-tertiary)] px-2 py-1">
                  <span className="text-[11px] font-medium text-orange-400">{v.key}</span>
                  <span className="ml-auto text-[11px] text-[var(--text-secondary)] truncate max-w-[180px]">
                    {v.type === "secret" ? "••••••••" : (v.currentValue || v.initialValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeVars.length === 0 && activeGlobals.length === 0 && (
          <p className="py-4 text-center text-xs text-[var(--text-secondary)]">No variables defined</p>
        )}
      </div>
      <div className="border-t border-[var(--border)] px-4 py-2">
        <p className="text-[10px] text-[var(--text-secondary)]">{Object.keys(resolved).length} variable{Object.keys(resolved).length !== 1 ? "s" : ""} resolved</p>
      </div>
    </div>
  );
}

function EnvironmentManager({ onClose }: { onClose: () => void }) {
  const {
    environments, activeEnvironmentId, globals,
    updateVariables, setGlobals, removeEnvironment, renameEnvironment,
    duplicateEnvironment, setActiveEnvironment, addEnvironment,
    exportEnvironment, importEnvironment,
  } = useEnvironmentStore();

  const [selectedTab, setSelectedTab] = useState<string>(activeEnvironmentId || "globals");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedEnv = environments.find((e) => e.id === selectedTab);
  const isGlobals = selectedTab === "globals";
  const currentVars = isGlobals ? globals : selectedEnv?.variables || [];

  const updateVar = (index: number, field: keyof EnvironmentVariable, value: string | boolean) => {
    const newVars = [...currentVars];
    newVars[index] = { ...newVars[index], [field]: value };
    const last = newVars[newVars.length - 1];
    if (last && (last.key.trim() || last.initialValue.trim() || last.currentValue.trim())) {
      newVars.push({ key: "", initialValue: "", currentValue: "", type: "default", enabled: true });
    }
    if (isGlobals) { setGlobals(newVars); }
    else if (selectedEnv) { updateVariables(selectedEnv.id, newVars); }
  };

  const removeVar = (index: number) => {
    if (currentVars.length <= 1) return;
    const newVars = currentVars.filter((_, i) => i !== index);
    if (isGlobals) { setGlobals(newVars); }
    else if (selectedEnv) { updateVariables(selectedEnv.id, newVars); }
  };

  const handleExport = () => {
    if (!selectedEnv) return;
    const json = exportEnvironment(selectedEnv.id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEnv.name}.postman_environment.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { importEnvironment(ev.target?.result as string); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAddNew = () => {
    const id = addEnvironment("New Environment");
    setSelectedTab(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Manage Environments</h2>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" aria-label="Import environment file" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Import environment">
              <Upload size={12} /> Import
            </button>
            <button type="button" onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]" aria-label="Close"><X size={18} /></button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden h-[500px]">
          {/* Left Sidebar */}
          <div className="flex w-52 flex-col border-r border-[var(--border)]">
            <button type="button" onClick={() => setSelectedTab("globals")}
              className={`flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium border-b border-[var(--border)] ${isGlobals ? "bg-[var(--bg-tertiary)] text-[var(--accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"}`}>
              <Globe size={13} /> Globals
            </button>
            <div className="flex-1 overflow-auto">
              {environments.map((env) => (
                <button key={env.id} type="button" onClick={() => setSelectedTab(env.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${selectedTab === env.id ? "bg-[var(--bg-tertiary)] text-[var(--accent)] font-medium" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"}`}>
                  <span className="truncate">{env.name}</span>
                  {env.id === activeEnvironmentId && <span className="ml-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--success)]" />}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleAddNew}
              className="flex items-center gap-1.5 border-t border-[var(--border)] px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]">
              <Plus size={12} /> Add Environment
            </button>
          </div>
          {/* Right Panel */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Actions Bar */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
              {isGlobals ? (
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-orange-400" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Global Variables</span>
                </div>
              ) : selectedEnv ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={selectedEnv.name} onChange={(e) => renameEnvironment(selectedEnv.id, e.target.value)}
                    className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-sm font-medium text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    aria-label="Environment name" />
                  <button type="button" onClick={() => setActiveEnvironment(selectedEnv.id)}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${activeEnvironmentId === selectedEnv.id ? "bg-green-900/20 text-[var(--success)]" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
                    {activeEnvironmentId === selectedEnv.id ? "✓ Active" : "Set Active"}
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[var(--text-secondary)]">Select an environment</span>
              )}
              {selectedEnv && !isGlobals && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => duplicateEnvironment(selectedEnv.id)} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Duplicate"><Copy size={13} /></button>
                  <button type="button" onClick={handleExport} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]" title="Export"><Download size={13} /></button>
                  <button type="button" onClick={() => { removeEnvironment(selectedEnv.id); setSelectedTab("globals"); }} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)]" title="Delete"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
            {/* Info */}
            <div className="border-b border-[var(--border)] px-4 py-2">
              <p className="text-[10px] text-[var(--text-secondary)]">
                {isGlobals ? "Global variables are available in all environments. Use {{variable_name}} syntax." : "Initial Value is shared when exporting. Current Value is local only and overrides Initial Value."}
              </p>
            </div>
            {/* Variables Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="mb-2 grid grid-cols-[28px_1fr_1fr_1fr_70px_28px] items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <span></span><span>Variable</span><span>Initial Value</span><span>Current Value</span><span>Type</span><span></span>
              </div>
              <div className="space-y-1">
                {currentVars.map((v, i) => (
                  <div key={i} className="grid grid-cols-[28px_1fr_1fr_1fr_70px_28px] items-center gap-2">
                    <input type="checkbox" checked={v.enabled} onChange={(e) => updateVar(i, "enabled", e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--accent)]" aria-label={`Enable variable ${v.key || i + 1}`} />
                    <input type="text" value={v.key} onChange={(e) => updateVar(i, "key", e.target.value)} placeholder="Variable name"
                      className="rounded border border-transparent bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent)]" />
                    <input type="text" value={v.initialValue} onChange={(e) => updateVar(i, "initialValue", e.target.value)} placeholder="Initial value"
                      className="rounded border border-transparent bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent)]" />
                    <input type={v.type === "secret" ? "password" : "text"} value={v.currentValue} onChange={(e) => updateVar(i, "currentValue", e.target.value)} placeholder="Current value"
                      className="rounded border border-transparent bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 outline-none focus:border-[var(--accent)]" />
                    <select value={v.type} onChange={(e) => updateVar(i, "type", e.target.value)} title="Variable type"
                      className="rounded bg-[var(--bg-tertiary)] px-1 py-1.5 text-[10px] text-[var(--text-primary)] outline-none">
                      <option value="default">default</option>
                      <option value="secret">secret</option>
                    </select>
                    <button type="button" onClick={() => removeVar(i)} className="rounded p-0.5 text-[var(--text-secondary)] hover:text-[var(--error)]" aria-label="Remove variable"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
