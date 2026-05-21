import { AppShell } from "@/components/layout/app-shell";
import { SyncProvider } from "@/components/providers/sync-provider";
import { HydrationProvider } from "@/components/providers/hydration-provider";

export default function AppPage() {
  return (
    <HydrationProvider>
      <SyncProvider>
        <AppShell />
      </SyncProvider>
    </HydrationProvider>
  );
}
