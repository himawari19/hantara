import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface Tab {
  id: string;
  requestId: string;
  name: string;
  method: string;
  collectionName: string;
  isDirty: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (tab: Omit<Tab, "isDirty">) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, data: Partial<Tab>) => void;
  markDirty: (tabId: string, dirty: boolean) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (tabData) => {
        const { tabs } = get();
        const existing = tabs.find((t) => t.requestId === tabData.requestId);

        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }

        const newTab: Tab = { ...tabData, isDirty: false };
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }));
      },

      closeTab: (tabId) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== tabId);
          let newActiveId = state.activeTabId;

          if (state.activeTabId === tabId) {
            const idx = state.tabs.findIndex((t) => t.id === tabId);
            if (newTabs.length > 0) {
              newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
            } else {
              newActiveId = null;
            }
          }

          return { tabs: newTabs, activeTabId: newActiveId };
        });
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTab: (tabId, data) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...data } : t)),
        }));
      },

      markDirty: (tabId, dirty) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: dirty } : t)),
        }));
      },

      closeAllTabs: () => {
        set({ tabs: [], activeTabId: null });
      },

      closeOtherTabs: (tabId) => {
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id === tabId),
          activeTabId: tabId,
        }));
      },
    }),
    {
      name: "hantara-tabs",
      storage: idbStorage,
    }
  )
);
