import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface ChainVariable {
  key: string;
  value: string;
  source: string; // e.g. "response.body.token" or "response.headers.x-auth"
  requestId: string;
}

interface ChainState {
  // Variables extracted from responses that can be used in subsequent requests
  chainVariables: Record<string, string>;
  // Definitions of what to extract
  extractions: ChainVariable[];

  setChainVariable: (key: string, value: string) => void;
  clearChainVariables: () => void;
  addExtraction: (extraction: ChainVariable) => void;
  removeExtraction: (key: string) => void;
  updateExtraction: (key: string, data: Partial<ChainVariable>) => void;
  extractFromResponse: (requestId: string, responseBody: string, responseHeaders: Record<string, string>) => void;
  interpolateChain: (text: string) => string;
}

export const useChainStore = create<ChainState>()(
  persist(
    (set, get) => ({
      chainVariables: {},
      extractions: [],

      setChainVariable: (key, value) => {
        set((state) => ({
          chainVariables: { ...state.chainVariables, [key]: value },
        }));
      },

      clearChainVariables: () => set({ chainVariables: {} }),

      addExtraction: (extraction) => {
        set((state) => ({
          extractions: [...state.extractions, extraction],
        }));
      },

      removeExtraction: (key) => {
        set((state) => ({
          extractions: state.extractions.filter((e) => e.key !== key),
          chainVariables: (() => {
            const vars = { ...state.chainVariables };
            delete vars[key];
            return vars;
          })(),
        }));
      },

      updateExtraction: (key, data) => {
        set((state) => ({
          extractions: state.extractions.map((e) => (e.key === key ? { ...e, ...data } : e)),
        }));
      },

      extractFromResponse: (requestId, responseBody, responseHeaders) => {
        const { extractions } = get();
        const relevantExtractions = extractions.filter((e) => e.requestId === requestId);

        if (relevantExtractions.length === 0) return;

        let parsedBody: any = null;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          // not JSON
        }

        const newVars: Record<string, string> = {};

        relevantExtractions.forEach((extraction) => {
          const { key, source } = extraction;
          let value = "";

          if (source.startsWith("response.body.")) {
            const path = source.replace("response.body.", "");
            value = getNestedValue(parsedBody, path);
          } else if (source.startsWith("response.headers.")) {
            const headerName = source.replace("response.headers.", "");
            value = responseHeaders[headerName] || responseHeaders[headerName.toLowerCase()] || "";
          } else if (source === "response.body") {
            value = responseBody;
          } else if (source.startsWith("response.status")) {
            // handled elsewhere
          }

          if (value) {
            newVars[key] = String(value);
          }
        });

        if (Object.keys(newVars).length > 0) {
          set((state) => ({
            chainVariables: { ...state.chainVariables, ...newVars },
          }));
        }
      },

      interpolateChain: (text) => {
        const { chainVariables } = get();
        let result = text;
        Object.entries(chainVariables).forEach(([key, value]) => {
          const pattern = new RegExp(`\\{\\{\\s*chain\\.${escapeRegex(key)}\\s*\\}\\}`, "g");
          result = result.replace(pattern, value);
        });
        return result;
      },
    }),
    { name: "hantara-chain", storage: idbStorage }
  )
);

function getNestedValue(obj: any, path: string): string {
  if (!obj) return "";
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return "";
    // Handle array index
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = current[arrayMatch[1]]?.[Number(arrayMatch[2])];
    } else {
      current = current[part];
    }
  }
  if (typeof current === "object") return JSON.stringify(current);
  return String(current ?? "");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
