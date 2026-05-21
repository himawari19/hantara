"use client";

import { useState, useRef } from "react";
import { useEnvironmentStore } from "@/store/environment-store";

interface SSEMessage {
  id?: string;
  event: string;
  data: string;
  timestamp: number;
}

export function SSEPanel() {
  const [url, setUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const interpolate = useEnvironmentStore((s) => s.interpolate);

  const connect = () => {
    const resolvedUrl = interpolate(url);
    if (!resolvedUrl.trim()) {
      setError("URL is required");
      return;
    }

    const fullUrl = resolvedUrl.match(/^https?:\/\//) ? resolvedUrl : `https://${resolvedUrl}`;

    try {
      const es = new EventSource(fullUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(null);
      };

      es.onmessage = (event) => {
        setMessages((prev) => [
          ...prev,
          { event: "message", data: event.data, id: event.lastEventId, timestamp: Date.now() },
        ]);
      };

      es.onerror = () => {
        setError("Connection lost");
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Connection Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <span className="rounded bg-orange-600/20 px-2 py-1 text-xs font-bold text-orange-400">
          SSE
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/events"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          onKeyDown={(e) => { if (e.key === "Enter" && !connected) connect(); }}
        />
        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--accent-hover)]"
          >
            Connect
          </button>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <div className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
        <span className="text-xs text-[var(--text-secondary)]">
          {connected ? "Listening for events..." : "Disconnected"}
        </span>
        <span className="ml-auto text-xs text-[var(--text-secondary)]">
          {messages.length} events received
        </span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--error)]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-[var(--border)] bg-red-900/10 px-3 py-1.5">
          <span className="text-xs text-[var(--error)]">{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-[var(--text-secondary)]">
            {connected ? "Waiting for events..." : "Connect to an SSE endpoint to receive events."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg, i) => (
              <div key={i} className="rounded border border-[var(--border)] bg-[var(--bg-tertiary)] p-2">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-orange-400">↓ {msg.event}</span>
                  {msg.id && <span className="text-[10px] text-[var(--text-secondary)]">id: {msg.id}</span>}
                  <span className="ml-auto text-[10px] text-[var(--text-secondary)]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-xs text-[var(--text-primary)]">
                  {msg.data}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
