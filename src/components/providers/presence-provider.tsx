"use client";

import { useEffect, useRef } from "react";
import { usePresenceStore } from "@/store/presence-store";
import { useCollectionStore } from "@/store/collection-store";
import { getSupabase } from "@/lib/supabase/client";

/**
 * PresenceProvider
 * 
 * Uses Supabase Realtime Presence to track which users are online
 * and which request they're currently editing.
 */
export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<any>(null);
  const { localUserId, localUserName, localUserColor, setUsers, addUser, removeUser } = usePresenceStore();
  const activeRequestId = useCollectionStore((s) => s.activeRequestId);
  const prevRequestId = useRef(activeRequestId);

  // Initialize presence channel
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase.channel("presence-room", {
      config: { presence: { key: localUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.entries(state).map(([key, presences]: [string, any]) => {
          const presence = presences[0];
          return {
            id: key,
            name: presence?.name || "Anonymous",
            color: presence?.color || "#3b82f6",
            activeRequestId: presence?.activeRequestId || null,
            lastSeen: Date.now(),
          };
        });
        setUsers(users);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
        const presence = newPresences[0];
        if (presence) {
          addUser({
            id: key,
            name: presence.name || "Anonymous",
            color: presence.color || "#3b82f6",
            activeRequestId: presence.activeRequestId || null,
            lastSeen: Date.now(),
          });
        }
      })
      .on("presence", { event: "leave" }, ({ key }: any) => {
        removeUser(key);
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: localUserName,
            color: localUserColor,
            activeRequestId: activeRequestId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [localUserId, localUserName, localUserColor]);

  // Update presence when active request changes
  useEffect(() => {
    if (prevRequestId.current === activeRequestId) return;
    prevRequestId.current = activeRequestId;

    if (channelRef.current) {
      channelRef.current.track({
        name: localUserName,
        color: localUserColor,
        activeRequestId: activeRequestId,
        online_at: new Date().toISOString(),
      });
    }
  }, [activeRequestId, localUserName, localUserColor]);

  return <>{children}</>;
}
