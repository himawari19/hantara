import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface MockRoute {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  responseStatus: number;
  responseBody: string;
  responseHeaders: Record<string, string>;
  delayMs: number;
  isActive: boolean;
  description: string;
}

export interface MockServer {
  id: string;
  name: string;
  baseUrl: string;
  routes: MockRoute[];
  isActive: boolean;
  createdAt: number;
}

interface MockState {
  servers: MockServer[];
  addServer: (name: string) => void;
  removeServer: (id: string) => void;
  updateServer: (id: string, data: Partial<MockServer>) => void;
  toggleServer: (id: string) => void;
  addRoute: (serverId: string, route?: Partial<MockRoute>) => void;
  removeRoute: (serverId: string, routeId: string) => void;
  updateRoute: (serverId: string, routeId: string, data: Partial<MockRoute>) => void;
  toggleRoute: (serverId: string, routeId: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export const useMockStore = create<MockState>()(
  persist(
    (set) => ({
      servers: [],

      addServer: (name) => {
        const server: MockServer = {
          id: generateId(),
          name,
          baseUrl: `/api/mock/${generateId().slice(0, 8)}`,
          routes: [],
          isActive: true,
          createdAt: Date.now(),
        };
        set((state) => ({ servers: [...state.servers, server] }));
      },

      removeServer: (id) => {
        set((state) => ({ servers: state.servers.filter((s) => s.id !== id) }));
      },

      updateServer: (id, data) => {
        set((state) => ({
          servers: state.servers.map((s) => (s.id === id ? { ...s, ...data } : s)),
        }));
      },

      toggleServer: (id) => {
        set((state) => ({
          servers: state.servers.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
        }));
      },

      addRoute: (serverId, routeData) => {
        const route: MockRoute = {
          id: generateId(),
          method: "GET",
          path: "/",
          responseStatus: 200,
          responseBody: '{\n  "message": "Hello from mock server"\n}',
          responseHeaders: { "Content-Type": "application/json" },
          delayMs: 0,
          isActive: true,
          description: "",
          ...routeData,
        };
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === serverId ? { ...s, routes: [...s.routes, route] } : s
          ),
        }));
      },

      removeRoute: (serverId, routeId) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === serverId ? { ...s, routes: s.routes.filter((r) => r.id !== routeId) } : s
          ),
        }));
      },

      updateRoute: (serverId, routeId, data) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === serverId
              ? { ...s, routes: s.routes.map((r) => (r.id === routeId ? { ...r, ...data } : r)) }
              : s
          ),
        }));
      },

      toggleRoute: (serverId, routeId) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === serverId
              ? { ...s, routes: s.routes.map((r) => (r.id === routeId ? { ...r, isActive: !r.isActive } : r)) }
              : s
          ),
        }));
      },
    }),
    { name: "hantara-mock-servers", storage: idbStorage }
  )
);
