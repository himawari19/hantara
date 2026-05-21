import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string; enabled: boolean }[];
}

interface EnvironmentState {
  environments: Environment[];
  activeEnvironmentId: string | null;

  addEnvironment: (name: string) => void;
  removeEnvironment: (id: string) => void;
  renameEnvironment: (id: string, name: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  updateVariables: (envId: string, variables: Environment["variables"]) => void;
  interpolate: (text: string) => string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvironmentId: null,

      addEnvironment: (name) => {
        const env: Environment = {
          id: generateId(),
          name,
          variables: [{ key: "", value: "", enabled: true }],
        };
        set((state) => ({
          environments: [...state.environments, env],
          activeEnvironmentId: state.activeEnvironmentId || env.id,
        }));
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

      interpolate: (text) => {
        const state = get();
        const activeEnv = state.environments.find(
          (e) => e.id === state.activeEnvironmentId
        );
        if (!activeEnv) return text;

        let result = text;
        activeEnv.variables
          .filter((v) => v.enabled && v.key.trim())
          .forEach((v) => {
            const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(v.key)}\\s*\\}\\}`, "g");
            result = result.replace(pattern, v.value);
          });

        return result;
      },
    }),
    {
      name: "hantara-environments",
    }
  )
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
