import { create } from "zustand";

export interface Shortcut {
  id: string;
  label: string;
  keys: string;
  action: string;
}

interface ShortcutsState {
  showPanel: boolean;
  togglePanel: () => void;
  shortcuts: Shortcut[];
}

export const defaultShortcuts: Shortcut[] = [
  { id: "send", label: "Send Request", keys: "Ctrl+Enter", action: "send" },
  { id: "save", label: "Save Request", keys: "Ctrl+S", action: "save" },
  { id: "new-request", label: "New Request", keys: "Ctrl+N", action: "newRequest" },
  { id: "new-tab", label: "New Tab", keys: "Ctrl+T", action: "newTab" },
  { id: "close-tab", label: "Close Tab", keys: "Ctrl+W", action: "closeTab" },
  { id: "search", label: "Search Collections", keys: "Ctrl+K", action: "search" },
  { id: "toggle-sidebar", label: "Toggle Sidebar", keys: "Ctrl+B", action: "toggleSidebar" },
  { id: "toggle-console", label: "Toggle Console", keys: "Ctrl+`", action: "toggleConsole" },
  { id: "switch-env", label: "Switch Environment", keys: "Ctrl+E", action: "switchEnv" },
  { id: "duplicate", label: "Duplicate Request", keys: "Ctrl+D", action: "duplicate" },
  { id: "format-body", label: "Format Body", keys: "Ctrl+Shift+F", action: "formatBody" },
  { id: "generate-code", label: "Generate Code", keys: "Ctrl+Shift+C", action: "generateCode" },
];

export const useShortcutsStore = create<ShortcutsState>((set) => ({
  showPanel: false,
  togglePanel: () => set((state) => ({ showPanel: !state.showPanel })),
  shortcuts: defaultShortcuts,
}));
