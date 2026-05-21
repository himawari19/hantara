"use client";

import { useState, useRef, useEffect } from "react";
import { useRequestStore } from "@/store/request-store";
import { Send, Plug, Unplug, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface WsMessage {
  id: string;
  type: "sent" | "received" | "system";
  data: string;
  timestamp: number;
}

export function WebSocketPanel() {
  const { url, setUrl } = useRequestStore();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [protocols, setProtocols] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connect = () => {
    if (!url.trim()) return;

    try {
      const wsUrl = url.startsWith("ws") ? url : url.replace(/^http/, "ws");
      const protoArray = protocols.trim() ? protocols.split(",").map((p) => p.trim()) : undefined;
      const ws = new WebSocket(wsUrl, protoArray);

      ws.onopen = () => {
        setConnected(true);
        addMessage("system", `Connected to ${wsUrl}`);
      };

      ws.onmessage = (event) => {
        addMessage("received", typeof event.data === "string" ? event.data : "[Binary data]");
      };

      ws.onerror = () => {
        addMessage("system", "Connection error");
      };

      ws.onclose = (event) => {
        setConnected(false);
        addMessage("system", `Disconnected (code: ${event.code}, reason: ${event.reason || "none"})`);
      };

      wsRef.current = ws;
    } catch (err: any) {
      addMessage("system", `Failed to connect: ${err.message}`);
    }
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(inputMessage);
    addMessage("sent", inputMessage);
    setInputMessage("");
  };

  const addMessage = (type: WsMessage["type"], data: string) => {
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), type, data, timestamp: Date.now() },
    ]);
  };

  const clearMessages = () => setMessages([]);

  const messageColors = {
    sent: "border-l-[var(--info)]",
    received: "border-l-[var(--success)]",
    system: "border-l-[var(--warning)]",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Connection Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-3">
        <span className="rounded bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs font-bold text-purple-400">
          WS
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ws://localhost:8080 or wss://echo.websocket.org"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !connected) connect();
          }}
        />
        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            className="flex items-center gap-1.5 rounded bg-[var(--error)] px-4 py-2 text-sm font-bold text-white"
          >
            <Unplug size={14} /> Disconnect
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="flex items-center gap-1.5 rounded bg-[var(--success)] px-4 py-2 text-sm font-bold text-white"
          >
            <Plug size={14} /> Connect
          </button>
        )}
      </div>

      {/* Protocols */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <label className="text-xs text-[var(--text-secondary)]">Protocols:</label>
        <input
          type="text"
          value={protocols}
          onChange={(e) => setProtocols(e.target.value)}
          placeholder="Optional: protocol1, protocol2"
          className="flex-1 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
        />
        <div className={`h-2 w-2 rounded-full ${connected ? "bg-[var(--success)]" : "bg-[var(--text-secondary)]"}`} />
        <span className="text-[10px] text-[var(--text-secondary)]">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Connect to a WebSocket server to start messaging
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded border-l-2 bg-[var(--bg-tertiary)] px-3 py-2 ${messageColors[msg.type]}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {msg.type === "sent" && <ArrowUp size={10} className="text-[var(--info)]" />}
                  {msg.type === "received" && <ArrowDown size={10} className="text-[var(--success)]" />}
                  <span className="text-[10px] font-medium uppercase text-[var(--text-secondary)]">
                    {msg.type}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs text-[var(--text-primary)]">
                  {formatMessage(msg.data)}
                </pre>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Send Message */}
      <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message to send..."
          className="flex-1 resize-none rounded bg-[var(--bg-tertiary)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={sendMessage}
            disabled={!connected}
            className="rounded bg-[var(--accent)] p-2 text-white disabled:opacity-30"
            title="Send (Ctrl+Enter)"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
          <button
            type="button"
            onClick={clearMessages}
            className="rounded p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title="Clear messages"
            aria-label="Clear messages"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatMessage(data: string): string {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
}
