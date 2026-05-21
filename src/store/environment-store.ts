import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface EnvironmentVariable {
  key: string;
  initialValue: string;
  currentValue: string;
  type: "default" | "secret";
  enabled: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;
  globals: EnvironmentVariable[];

  // Environment CRUD
  addEnvironment: (name: string) => string;
  removeEnvironment: (id: string) => void;
  renameEnvironment: (id: string, name: string) => void;
  duplicateEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;

  // Variables
  updateVariables: (envId: string, variables: EnvironmentVariable[]) => void;
  setGlobals: (variables: EnvironmentVariable[]) => void;

  // Variable manipulation (like Postman pm.variables.set/get)
  setVariable: (key: string, value: string) => void;
  getVariable: (key: string) => string | undefined;
  setGlobalVariable: (key: string, value: string) => void;
  getGlobalVariable: (key: string) => string | undefined;

  // Interpolation
  interpolate: (text: string) => string;
  getResolvedVariables: () => Record<string, string>;

  // Import/Export
  exportEnvironment: (id: string) => string;
  importEnvironment: (json: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptyVariable(): EnvironmentVariable {
  return { key: "", initialValue: "", currentValue: "", type: "default", enabled: true };
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvironmentId: null,
      globals: [createEmptyVariable()],

      addEnvironment: (name) => {
        const env: Environment = {
          id: generateId(),
          name,
          variables: [createEmptyVariable()],
        };
        set((state) => ({
          environments: [...state.environments, env],
          activeEnvironmentId: state.activeEnvironmentId || env.id,
        }));
        return env.id;
      },

      removeEnvironment: (id) => {
        set((state) => ({
          environments: state.environments.filter((e) => e.id !== id),
          activeEnvironmentId:
            state.activeEnvironmentId === id ? null : state.activeEnvironmentId,
        }));
      },

      renameEnvironment: (id, name) => {
        set((state) => ({
          environments: state.environments.map((e) =>
            e.id === id ? { ...e, name } : e
          ),
        }));
      },

      duplicateEnvironment: (id) => {
        const state = get();
        const env = state.environments.find((e) => e.id === id);
        if (!env) return;
        const newEnv: Environment = {
          id: generateId(),
          name: `${env.name} Copy`,
          variables: env.variables.map((v) => ({ ...v })),
        };
        set((state) => ({
          environments: [...state.environments, newEnv],
        }));
      },

      setActiveEnvironment: (id) => {
        set({ activeEnvironmentId: id });
      },

      updateVariables: (envId, variables) => {
        set((state) => ({
          environments: state.environments.map((e) =>
            e.id === envId ? { ...e, variables } : e
          ),
        }));
      },

      setGlobals: (variables) => {
        set({ globals: variables });
      },

      setVariable: (key, value) => {
        const state = get();
        const activeEnv = state.environments.find((e) => e.id === state.activeEnvironmentId);
        if (!activeEnv) return;
        const existing = activeEnv.variables.find((v) => v.key === key);
        if (existing) {
          set((s) => ({
            environments: s.environments.map((e) =>
              e.id === s.activeEnvironmentId
                ? {
                    ...e,
                    variables: e.variables.map((v) =>
                      v.key === key ? { ...v, currentValue: value } : v
                    ),
                  }
                : e
            ),
          }));
        } else {
          set((s) => ({
            environments: s.environments.map((e) =>
              e.id === s.activeEnvironmentId
                ? {
                    ...e,
                    variables: [
                      ...e.variables.filter((v) => v.key.trim()),
                      { key, initialValue: "", currentValue: value, type: "default" as const, enabled: true },
                      createEmptyVariable(),
                    ],
                  }
                : e
            ),
          }));
        }
      },

      getVariable: (key) => {
        const state = get();
        const activeEnv = state.environments.find((e) => e.id === state.activeEnvironmentId);
        if (!activeEnv) return undefined;
        const v = activeEnv.variables.find((v) => v.key === key && v.enabled);
        if (v) return v.currentValue || v.initialValue;
        // Fallback to globals
        const g = state.globals.find((v) => v.key === key && v.enabled);
        return g ? g.currentValue || g.initialValue : undefined;
      },

      setGlobalVariable: (key, value) => {
        const state = get();
        const existing = state.globals.find((v) => v.key === key);
        if (existing) {
          set({
            globals: state.globals.map((v) =>
              v.key === key ? { ...v, currentValue: value } : v
            ),
          });
        } else {
          set({
            globals: [
              ...state.globals.filter((v) => v.key.trim()),
              { key, initialValue: "", currentValue: value, type: "default" as const, enabled: true },
              createEmptyVariable(),
            ],
          });
        }
      },

      getGlobalVariable: (key) => {
        const state = get();
        const g = state.globals.find((v) => v.key === key && v.enabled);
        return g ? g.currentValue || g.initialValue : undefined;
      },

      getResolvedVariables: () => {
        const state = get();
        const result: Record<string, string> = {};

        // Globals (lowest priority)
        state.globals
          .filter((v) => v.enabled && v.key.trim())
          .forEach((v) => {
            result[v.key] = v.currentValue || v.initialValue;
          });

        // Active environment variables (higher priority)
        const activeEnv = state.environments.find((e) => e.id === state.activeEnvironmentId);
        if (activeEnv) {
          activeEnv.variables
            .filter((v) => v.enabled && v.key.trim())
            .forEach((v) => {
              result[v.key] = v.currentValue || v.initialValue;
            });
        }

        return result;
      },

      interpolate: (text) => {
        if (!text) return text;
        const state = get();
        let result = text;

        // Build resolved variables map (globals + active env)
        const vars: Record<string, string> = {};

        // Globals first (lower priority)
        state.globals
          .filter((v) => v.enabled && v.key.trim())
          .forEach((v) => {
            vars[v.key] = v.currentValue || v.initialValue;
          });

        // Active environment (higher priority, overrides globals)
        const activeEnv = state.environments.find(
          (e) => e.id === state.activeEnvironmentId
        );
        if (activeEnv) {
          activeEnv.variables
            .filter((v) => v.enabled && v.key.trim())
            .forEach((v) => {
              vars[v.key] = v.currentValue || v.initialValue;
            });
        }

        // Replace all {{variable}} patterns
        result = result.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, varName) => {
          const trimmed = varName.trim();
          return trimmed in vars ? vars[trimmed] : match;
        });

        return result;
      },

      exportEnvironment: (id) => {
        const state = get();
        const env = state.environments.find((e) => e.id === id);
        if (!env) return "{}";
        // Export format similar to Postman (only initial values for sharing)
        const exported = {
          name: env.name,
          values: env.variables
            .filter((v) => v.key.trim())
            .map((v) => ({
              key: v.key,
              value: v.initialValue,
              type: v.type,
              enabled: v.enabled,
            })),
          _postman_variable_scope: "environment",
        };
        return JSON.stringify(exported, null, 2);
      },

      importEnvironment: (json) => {
        try {
          const data = JSON.parse(json);
          const name = data.name || "Imported Environment";
          const variables: EnvironmentVariable[] = (data.values || []).map(
            (v: { key?: string; value?: string; type?: string; enabled?: boolean }) => ({
              key: v.key || "",
              initialValue: v.value || "",
              currentValue: v.value || "",
              type: v.type === "secret" ? "secret" : "default",
              enabled: v.enabled !== false,
            })
          );
          variables.push(createEmptyVariable());

          const env: Environment = { id: generateId(), name, variables };
          set((state) => ({
            environments: [...state.environments, env],
          }));
        } catch {
          // Invalid JSON, ignore
        }
      },
    }),
    {
      name: "hantara-environments",
    }
  )
);
