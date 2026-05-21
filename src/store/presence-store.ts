import { create } from "zustand";

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  activeRequestId: string | null;
  lastSeen: number;
}

interface PresenceState {
  users: PresenceUser[];
  localUserId: string;
  localUserName: string;
  localUserColor: string;

  setUsers: (users: PresenceUser[]) => void;
  addUser: (user: PresenceUser) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<PresenceUser>) => void;
  setLocalUser: (name: string) => void;
  getActiveUsersOnRequest: (requestId: string) => PresenceUser[];
}

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getLocalUserId(): string {
  if (typeof window === "undefined") return "local";
  let id = localStorage.getItem("hantara-user-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("hantara-user-id", id);
  }
  return id;
}

function getLocalUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem("hantara-user-name") || "Anonymous";
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  users: [],
  localUserId: getLocalUserId(),
  localUserName: getLocalUserName(),
  localUserColor: getRandomColor(),

  setUsers: (users) => set({ users }),

  addUser: (user) => {
    set((state) => {
      if (state.users.find((u) => u.id === user.id)) {
        return { users: state.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) };
      }
      return { users: [...state.users, user] };
    });
  },

  removeUser: (userId) => {
    set((state) => ({ users: state.users.filter((u) => u.id !== userId) }));
  },

  updateUser: (userId, data) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, ...data } : u)),
    }));
  },

  setLocalUser: (name) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hantara-user-name", name);
    }
    set({ localUserName: name });
  },

  getActiveUsersOnRequest: (requestId) => {
    const { users, localUserId } = get();
    return users.filter((u) => u.id !== localUserId && u.activeRequestId === requestId);
  },
}));
