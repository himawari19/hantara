import { AppShell } from "@/components/layout/app-shell";
import { SyncProvider } from "@/components/providers/sync-provider";
import { HydrationProvider } from "@/components/providers/hydration-provider";
import { PresenceProvider } from "@/components/providers/presence-provider";

export default function AppPage() {
  return (
    <HydrationProvider>
      <SyncProvider>
        <PresenceProvider>
          <AppShell />
        </PresenceProvider>
      </SyncProvider>
    </HydrationProvider>
  );
}
