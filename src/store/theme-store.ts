import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark" as Theme,
      toggleTheme: () => {
        const newTheme: Theme = get().theme === "dark" ? "light" : "dark";
        set({ theme: newTheme });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", newTheme);
        }
      },
      setTheme: (theme: Theme) => {
        set({ theme });
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", theme);
        }
      },
    }),
    {
      name: "hantara-theme",
      storage: idbStorage,
      onRehydrateStorage: () => (state) => {
        if (state && typeof document !== "undefined") {
          document.documentElement.setAttribute("data-theme", state.theme);
        }
      },
    }
  )
);
