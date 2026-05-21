"use client";

import { useState, useEffect, useRef } from "react";
import { useCollectionStore, Collection, Folder, RequestItem } from "@/store/collection-store";
import { useTabStore } from "@/store/tab-store";
import { useRequestStore } from "@/store/request-store";
import { Search, X } from "lucide-react";

interface SearchDialogProps {
  onClose: () => void;
}

interface SearchResult {
  request: RequestItem;
  collectionName: string;
  folderPath: string;
}

export function SearchDialog({ onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { collections, setActiveRequest } = useCollectionStore();
  const { openTab } = useTabStore();
  const { setMethod, setUrl, setHeaders, setBody, setBodyType } = useRequestStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const found: SearchResult[] = [];

    function searchInFolder(folder: Folder, collectionName: string, path: string) {
      folder.requests.forEach((req) => {
        if (
          req.name.toLowerCase().includes(q) ||
          req.url.toLowerCase().includes(q) ||
          req.method.toLowerCase().includes(q)
        ) {
          found.push({ request: req, collectionName, folderPath: path + "/" + folder.name });
        }
      });
      folder.folders.forEach((sub) => searchInFolder(sub, collectionName, path + "/" + folder.name));
    }

    collections.forEach((col) => {
      col.requests.forEach((req) => {
        if (
          req.name.toLowerCase().includes(q) ||
          req.url.toLowerCase().includes(q) ||
          req.method.toLowerCase().includes(q)
        ) {
          found.push({ request: req, collectionName: col.name, folderPath: "" });
        }
      });
      col.folders.forEach((folder) => searchInFolder(folder, col.name, ""));
    });

    setResults(found.slice(0, 20));
    setSelectedIndex(0);
  }, [query, collections]);

  const selectResult = (result: SearchResult) => {
    setActiveRequest(result.request.id);
    openTab({
      id: result.request.id,
      requestId: result.request.id,
      name: result.request.name || result.request.url || "Untitled",
      method: result.request.method,
      collectionName: result.collectionName,
    });
    setMethod(result.request.method);
    setUrl(result.request.url);
    setHeaders(result.request.headers);
    setBody(result.request.body);
    setBodyType(result.request.bodyType);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const methodColors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-yellow-400",
    PUT: "text-blue-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-gray-400",
    OPTIONS: "text-cyan-400",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <Search size={18} className="text-[var(--text-secondary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search requests by name, URL, or method..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-auto">
          {results.length === 0 && query.trim() && (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No results found for &quot;{query}&quot;
            </p>
          )}
          {results.length === 0 && !query.trim() && (
            <p className="px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Type to search across all collections...
            </p>
          )}
          {results.map((result, i) => (
            <button
              key={result.request.id}
              type="button"
              onClick={() => selectResult(result)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                i === selectedIndex ? "bg-[var(--bg-tertiary)]" : "hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <span className={`min-w-[40px] text-[10px] font-bold ${methodColors[result.request.method] || "text-gray-400"}`}>
                {result.request.method}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-[var(--text-primary)]">
                  {result.request.name || "Untitled"}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {result.collectionName}{result.folderPath}
                  {result.request.url && ` • ${result.request.url}`}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--text-secondary)]">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
