"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useChainStore } from "@/store/chain-store";
import { useCollectionStore } from "@/store/collection-store";
import { X, Plus, Trash2, ArrowRight, Link2, GripVertical, Zap, Play } from "lucide-react";

interface ChainNode {
  id: string;
  requestId: string;
  name: string;
  method: string;
  x: number;
  y: number;
}

interface ChainConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  extractionKey: string;
  source: string;
}

export function VisualChainBuilder() {
  const { extractions, addExtraction, removeExtraction, chainVariables } = useChainStore();
  const { collections } = useCollectionStore();
  const [nodes, setNodes] = useState<ChainNode[]>(() => buildNodesFromExtractions());
  const [connections, setConnections] = useState<ChainConnection[]>(() => buildConnectionsFromExtractions());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromNodeId: string } | null>(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState<{ from: string; to: string } | null>(null);
  const [newExtractionKey, setNewExtractionKey] = useState("");
  const [newExtractionSource, setNewExtractionSource] = useState("response.body.");
  const canvasRef = useRef<HTMLDivElement>(null);

  const allRequests = useMemo(() => getAllRequestsFlat(collections), [collections]);

  function buildNodesFromExtractions(): ChainNode[] {
    const nodeMap = new Map<string, ChainNode>();
    let x = 50;
    const y = 100;

    extractions.forEach((ext) => {
      if (!nodeMap.has(ext.requestId)) {
        const req = allRequests.find((r) => r.id === ext.requestId);
        nodeMap.set(ext.requestId, {
          id: ext.requestId,
          requestId: ext.requestId,
          name: req?.name || "Unknown",
          method: req?.method || "GET",
          x,
          y,
        });
        x += 250;
      }
    });

    return Array.from(nodeMap.values());
  }

  function buildConnectionsFromExtractions(): ChainConnection[] {
    return extractions.map((ext, i) => ({
      id: `conn-${i}`,
      fromNodeId: ext.requestId,
      toNodeId: "",
      extractionKey: ext.key,
      source: ext.source,
    }));
  }

  const handleAddNode = (requestId: string) => {
    const req = allRequests.find((r) => r.id === requestId);
    if (!req) return;

    const newNode: ChainNode = {
      id: requestId,
      requestId,
      name: req.name,
      method: req.method,
      x: 50 + nodes.length * 250,
      y: 100,
    };

    setNodes((prev) => {
      if (prev.find((n) => n.id === requestId)) return prev;
      return [...prev, newNode];
    });
    setShowAddNode(false);
  };

  const handleRemoveNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) => prev.filter((c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
    // Remove extractions for this node
    extractions
      .filter((e) => e.requestId === nodeId)
      .forEach((e) => removeExtraction(e.key));
    setSelectedNode(null);
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.button !== 0) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging({
      nodeId,
      offsetX: e.clientX - rect.left - node.x,
      offsetY: e.clientY - rect.top - node.y,
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, e.clientX - rect.left - dragging.offsetX);
    const y = Math.max(0, e.clientY - rect.top - dragging.offsetY);

    setNodes((prev) =>
      prev.map((n) => (n.id === dragging.nodeId ? { ...n, x, y } : n))
    );
  }, [dragging]);

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleStartConnect = (nodeId: string) => {
    setConnecting({ fromNodeId: nodeId });
  };

  const handleEndConnect = (nodeId: string) => {
    if (connecting && connecting.fromNodeId !== nodeId) {
      setShowConnectionDialog({ from: connecting.fromNodeId, to: nodeId });
    }
    setConnecting(null);
  };

  const handleCreateConnection = () => {
    if (!showConnectionDialog || !newExtractionKey.trim()) return;

    const conn: ChainConnection = {
      id: `conn-${Date.now()}`,
      fromNodeId: showConnectionDialog.from,
      toNodeId: showConnectionDialog.to,
      extractionKey: newExtractionKey.trim(),
      source: newExtractionSource.trim(),
    };

    setConnections((prev) => [...prev, conn]);
    addExtraction({
      key: newExtractionKey.trim(),
      source: newExtractionSource.trim(),
      value: "",
      requestId: showConnectionDialog.from,
    });

    setShowConnectionDialog(null);
    setNewExtractionKey("");
    setNewExtractionSource("response.body.");
  };

  const handleRemoveConnection = (connId: string) => {
    const conn = connections.find((c) => c.id === connId);
    if (conn) {
      removeExtraction(conn.extractionKey);
    }
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Zap size={14} className="text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--text-primary)]">Visual Chain Builder</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAddNode(true)}
            className="flex items-center gap-1 rounded bg-[var(--accent)] px-2.5 py-1 text-[10px] text-white hover:bg-[var(--accent-hover)]"
          >
            <Plus size={10} /> Add Node
          </button>
          {chainVariables && Object.keys(chainVariables).length > 0 && (
            <span className="rounded bg-green-900/20 px-2 py-0.5 text-[9px] text-green-400">
              {Object.keys(chainVariables).length} vars active
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-auto bg-[var(--bg-primary)]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ minHeight: 400 }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />

        {/* Connection Lines (SVG) */}
        <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
            const toNode = nodes.find((n) => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return null;

            const x1 = fromNode.x + 180;
            const y1 = fromNode.y + 40;
            const x2 = toNode.x;
            const y2 = toNode.y + 40;
            const midX = (x1 + x2) / 2;

            return (
              <g key={conn.id}>
                <path
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  opacity="0.6"
                />
                {/* Label */}
                <text
                  x={midX}
                  y={(y1 + y2) / 2 - 8}
                  textAnchor="middle"
                  className="text-[9px] fill-[var(--accent)]"
                >
                  {`{{chain.${conn.extractionKey}}}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute w-[180px] rounded-lg border shadow-md transition-shadow ${
              selectedNode === node.id
                ? "border-[var(--accent)] shadow-[var(--accent)]/20"
                : "border-[var(--border)] hover:shadow-lg"
            } bg-[var(--bg-secondary)]`}
            style={{ left: node.x, top: node.y }}
            onClick={() => setSelectedNode(node.id)}
          >
            {/* Node Header */}
            <div
              className="flex cursor-grab items-center gap-1.5 rounded-t-lg border-b border-[var(--border)] bg-[var(--bg-tertiary)] px-2 py-1.5 active:cursor-grabbing"
              onMouseDown={(e) => handleMouseDown(e, node.id)}
            >
              <GripVertical size={10} className="text-[var(--text-secondary)]" />
              <span className={`text-[9px] font-bold ${getMethodColor(node.method)}`}>{node.method}</span>
              <span className="flex-1 truncate text-[10px] text-[var(--text-primary)]">{node.name}</span>
            </div>

            {/* Node Body */}
            <div className="px-2 py-2">
              {/* Extracted variables from this node */}
              {extractions.filter((e) => e.requestId === node.id).map((ext) => (
                <div key={ext.key} className="flex items-center gap-1 text-[9px]">
                  <ArrowRight size={8} className="text-[var(--accent)]" />
                  <span className="font-mono text-[var(--info)]">{ext.key}</span>
                  {chainVariables[ext.key] && (
                    <span className="ml-auto max-w-[60px] truncate text-green-400">= {chainVariables[ext.key]}</span>
                  )}
                </div>
              ))}
              {extractions.filter((e) => e.requestId === node.id).length === 0 && (
                <span className="text-[9px] text-[var(--text-secondary)] opacity-50">No extractions</span>
              )}
            </div>

            {/* Node Actions */}
            <div className="flex items-center justify-between border-t border-[var(--border)] px-2 py-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleStartConnect(node.id); }}
                className={`rounded p-1 text-[var(--text-secondary)] hover:text-[var(--accent)] ${connecting ? "ring-1 ring-[var(--accent)]" : ""}`}
                title="Connect to another node"
                aria-label="Start connection"
              >
                <Link2 size={10} />
              </button>
              {connecting && connecting.fromNodeId !== node.id && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEndConnect(node.id); }}
                  className="rounded bg-[var(--accent)] px-2 py-0.5 text-[8px] text-white"
                >
                  Connect Here
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveNode(node.id); }}
                className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--error)]"
                title="Remove node"
                aria-label="Remove node"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Zap size={32} className="text-[var(--text-secondary)] opacity-30" />
            <p className="text-xs text-[var(--text-secondary)]">Add request nodes to build a chain</p>
            <p className="text-[10px] text-[var(--text-secondary)] opacity-60">
              Connect nodes to extract values from one response and use in the next
            </p>
          </div>
        )}
      </div>

      {/* Add Node Dialog */}
      {showAddNode && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30" onClick={() => setShowAddNode(false)}>
          <div className="max-h-[300px] w-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
              <span className="text-xs font-medium text-[var(--text-primary)]">Select Request</span>
            </div>
            {allRequests.map((req) => (
              <button
                key={req.id}
                type="button"
                onClick={() => handleAddNode(req.id)}
                className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-left hover:bg-[var(--bg-tertiary)]"
              >
                <span className={`text-[9px] font-bold ${getMethodColor(req.method)}`}>{req.method}</span>
                <span className="flex-1 truncate text-xs text-[var(--text-primary)]">{req.name}</span>
              </button>
            ))}
            {allRequests.length === 0 && (
              <p className="p-4 text-center text-xs text-[var(--text-secondary)]">No requests in collections</p>
            )}
          </div>
        </div>
      )}

      {/* Connection Dialog */}
      {showConnectionDialog && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30" onClick={() => setShowConnectionDialog(null)}>
          <div className="w-80 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="mb-3 text-xs font-medium text-[var(--text-primary)]">Create Extraction</h4>
            <p className="mb-3 text-[10px] text-[var(--text-secondary)]">
              Extract a value from the source request's response and make it available as a chain variable.
            </p>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] text-[var(--text-secondary)]">Variable Name</label>
                <input
                  type="text"
                  value={newExtractionKey}
                  onChange={(e) => setNewExtractionKey(e.target.value)}
                  placeholder="e.g. token, userId"
                  className="mt-0.5 w-full rounded bg-[var(--bg-tertiary)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-secondary)]">Source Path</label>
                <input
                  type="text"
                  value={newExtractionSource}
                  onChange={(e) => setNewExtractionSource(e.target.value)}
                  placeholder="e.g. response.body.data.token"
                  className="mt-0.5 w-full rounded bg-[var(--bg-tertiary)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
                />
              </div>
              <div className="mt-1 rounded bg-[var(--bg-tertiary)] p-2 text-[9px] text-[var(--text-secondary)]">
                Use as: <code className="text-[var(--accent)]">{`{{chain.${newExtractionKey || "name"}}}`}</code>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectionDialog(null)}
                  className="rounded px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateConnection}
                  disabled={!newExtractionKey.trim()}
                  className="rounded bg-[var(--accent)] px-3 py-1 text-xs text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getAllRequestsFlat(collections: any[]): { id: string; name: string; method: string; url: string }[] {
  const results: any[] = [];
  function collect(items: any[]) {
    items.forEach((item) => {
      if (item.requests) item.requests.forEach((r: any) => results.push(r));
      if (item.folders) collect(item.folders);
    });
  }
  collections.forEach((col) => {
    col.requests?.forEach((r: any) => results.push(r));
    if (col.folders) collect(col.folders);
  });
  return results;
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = { GET: "text-green-400", POST: "text-yellow-400", PUT: "text-blue-400", PATCH: "text-purple-400", DELETE: "text-red-400" };
  return colors[method] || "text-gray-400";
}
