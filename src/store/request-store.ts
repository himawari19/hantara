import { create } from "zustand";
import { useEnvironmentStore } from "./environment-store";

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

interface RequestState {
  // Current request being edited
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: "none" | "json" | "form-data" | "raw";

  // Response
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;

  // History
  history: { method: string; url: string; status: number; time: number; timestamp: number }[];

  // Actions
  setMethod: (method: RequestState["method"]) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: RequestState["headers"]) => void;
  setBody: (body: string) => void;
  setBodyType: (bodyType: RequestState["bodyType"]) => void;
  setResponse: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  sendRequest: () => Promise<void>;
  clearHistory: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  method: "GET",
  url: "",
  headers: [{ key: "", value: "", enabled: true }],
  body: "",
  bodyType: "none",
  response: null,
  isLoading: false,
  error: null,
  history: [],

  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setHeaders: (headers) => set({ headers }),
  setBody: (body) => set({ body }),
  setBodyType: (bodyType) => set({ bodyType }),
  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearHistory: () => set({ history: [] }),

  sendRequest: async () => {
    const { method, url, headers, body, bodyType } = get();
    const interpolate = useEnvironmentStore.getState().interpolate;

    if (!url.trim()) {
      set({ error: "URL is required" });
      return;
    }

    // Interpolate environment variables
    const resolvedUrl = interpolate(url);
    const resolvedBody = interpolate(body);

    set({ isLoading: true, error: null, response: null });

    const startTime = performance.now();

    try {
      const activeHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key.trim())
        .forEach((h) => {
          activeHeaders[interpolate(h.key)] = interpolate(h.value);
        });

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          url: resolvedUrl,
          headers: activeHeaders,
          body: bodyType !== "none" ? resolvedBody : undefined,
        }),
      });

      const data = await res.json();
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);

      set((state) => ({
        response: {
          status: data.status,
          statusText: data.statusText,
          headers: data.headers,
          body: typeof data.body === "string" ? data.body : JSON.stringify(data.body, null, 2),
          time: responseTime,
          size: new Blob([JSON.stringify(data.body)]).size,
        },
        isLoading: false,
        history: [
          { method, url: resolvedUrl, status: data.status, time: responseTime, timestamp: Date.now() },
          ...state.history.slice(0, 99), // Keep last 100
        ],
      }));
    } catch (err: any) {
      set({
        error: err.message || "Request failed",
        isLoading: false,
      });
    }
  },
}));
