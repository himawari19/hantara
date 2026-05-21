import { create } from "zustand";

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  cookies: { name: string; value: string; domain: string; path: string }[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

interface ResponseState {
  response: ResponseData | null;
  isLoading: boolean;
  error: string | null;
  testResults: TestResult[];
  scriptLogs: string[];

  setResponse: (response: ResponseData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTestResults: (results: TestResult[]) => void;
  setScriptLogs: (logs: string[]) => void;
  appendScriptLogs: (logs: string[]) => void;
  clearScriptLogs: () => void;
}

export const useResponseStore = create<ResponseState>((set) => ({
  response: null,
  isLoading: false,
  error: null,
  testResults: [],
  scriptLogs: [],

  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setTestResults: (results) => set({ testResults: results }),
  setScriptLogs: (logs) => set({ scriptLogs: logs }),
  appendScriptLogs: (logs) => set((state) => ({ scriptLogs: [...state.scriptLogs, ...logs] })),
  clearScriptLogs: () => set({ scriptLogs: [], testResults: [] }),
}));
