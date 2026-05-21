import { create } from "zustand";
import { persist } from "zustand/middleware";
import { idbStorage } from "@/lib/idb-storage";

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  type: "request_created" | "request_updated" | "request_deleted" | "collection_created" | "collection_deleted" | "folder_created" | "comment_added" | "environment_changed" | "request_sent";
  targetId: string;
  targetName: string;
  details?: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
  resolved: boolean;
}

interface ActivityState {
  events: ActivityEvent[];
  comments: Comment[];

  // Activity
  addEvent: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  clearEvents: () => void;
  getEventsForRequest: (requestId: string) => ActivityEvent[];

  // Comments
  addComment: (comment: Omit<Comment, "id" | "timestamp" | "resolved">) => void;
  resolveComment: (commentId: string) => void;
  deleteComment: (commentId: string) => void;
  getCommentsForRequest: (requestId: string) => Comment[];
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      events: [],
      comments: [],

      addEvent: (event) => {
        const newEvent: ActivityEvent = {
          ...event,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({
          events: [newEvent, ...state.events].slice(0, 500),
        }));
      },

      clearEvents: () => set({ events: [] }),

      getEventsForRequest: (requestId) => {
        return get().events.filter((e) => e.targetId === requestId);
      },

      addComment: (comment) => {
        const newComment: Comment = {
          ...comment,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          resolved: false,
        };
        set((state) => ({
          comments: [newComment, ...state.comments],
        }));
      },

      resolveComment: (commentId) => {
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? { ...c, resolved: true } : c
          ),
        }));
      },

      deleteComment: (commentId) => {
        set((state) => ({
          comments: state.comments.filter((c) => c.id !== commentId),
        }));
      },

      getCommentsForRequest: (requestId) => {
        return get().comments.filter((c) => c.requestId === requestId);
      },
    }),
    {
      name: "hantara-activity",
      storage: idbStorage,
    }
  )
);
