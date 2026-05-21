import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Pin Store - Pin favorite requests to the top of sidebar
 */

interface PinState {
  pinnedRequestIds: string[];
  pinRequest: (requestId: string) => void;
  unpinRequest: (requestId: string) => void;
  isPinned: (requestId: string) => boolean;
  togglePin: (requestId: string) => void;
}

export const usePinStore = create<PinState>()(
  persist(
    (set, get) => ({
      pinnedRequestIds: [],

      pinRequest: (requestId) => {
        set((state) => ({
          pinnedRequestIds: [...state.pinnedRequestIds, requestId],
        }));
      },

      unpinRequest: (requestId) => {
        set((state) => ({
          pinnedRequestIds: state.pinnedRequestIds.filter((id) => id !== requestId),
        }));
      },

      isPinned: (requestId) => {
        return get().pinnedRequestIds.includes(requestId);
      },

      togglePin: (requestId) => {
        const { pinnedRequestIds } = get();
        if (pinnedRequestIds.includes(requestId)) {
          set({ pinnedRequestIds: pinnedRequestIds.filter((id) => id !== requestId) });
        } else {
          set({ pinnedRequestIds: [...pinnedRequestIds, requestId] });
        }
      },
    }),
    { name: "hantara-pins" }
  )
);
