import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LockScreenSettingsPanel } from "@/components/dashboard/lock-screen-settings-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  hasLockScreenConfig,
  persistGlobalLockScreenConfig,
  readLockScreenConfig,
  readPersistedGlobalLockScreenConfig,
  type LockScreenConfig,
  writeLockScreenConfig,
} from "@/layouts/lock-screen-config";
import type { Page } from "@/modules/types";
import { dashboardService } from "@/services/dashboards";

export default function LockScreenPage() {
  const [config, setConfig] = useState<LockScreenConfig>(() =>
    readPersistedGlobalLockScreenConfig(),
  );
  const [activePage, setActivePage] = useState<Page | null>(null);
  const [hasRemoteConfig, setHasRemoteConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadActivePage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const page = await dashboardService.getActivePage();
      setActivePage(page);
      setHasRemoteConfig(Boolean(page && hasLockScreenConfig(page.style)));

      if (page && hasLockScreenConfig(page.style)) {
        const remoteConfig = readLockScreenConfig(page.style);
        setConfig(remoteConfig);
        persistGlobalLockScreenConfig(remoteConfig);
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load the active dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const page = await dashboardService.getActivePage();
        if (cancelled) return;

        setActivePage(page);
        setHasRemoteConfig(Boolean(page && hasLockScreenConfig(page.style)));

        if (page && hasLockScreenConfig(page.style)) {
          const remoteConfig = readLockScreenConfig(page.style);
          setConfig(remoteConfig);
          persistGlobalLockScreenConfig(remoteConfig);
        }
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load the active dashboard.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <Spinner className="size-6 text-primary" />
        <span>Loading lock screen configuration...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          <p className="font-medium">Could not load the lock screen.</p>
          <p className="mt-2 text-destructive/80">{loadError}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium transition hover:bg-destructive/10"
            onClick={() => {
              void loadActivePage();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="mx-auto flex min-h-[420px] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Mark a dashboard page as principal before configuring the lock screen.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1560px] pb-12">
      <LockScreenSettingsPanel
        initialConfig={config}
        forceHasChanges={!hasRemoteConfig}
        onSave={async (nextConfig) => {
          const nextStyle = writeLockScreenConfig(activePage.style, nextConfig);
          const updatedPage = await dashboardService.updatePage(activePage._id, {
            style: nextStyle,
          });
          const savedConfig = readLockScreenConfig(updatedPage.style);

          setActivePage(updatedPage);
          setHasRemoteConfig(true);
          setConfig(savedConfig);
          persistGlobalLockScreenConfig(savedConfig);
          toast.success("Lock screen updated");
        }}
      />
    </div>
  );
}
