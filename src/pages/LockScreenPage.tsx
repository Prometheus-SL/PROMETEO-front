import { useState } from "react";
import { toast } from "sonner";

import { LockScreenSettingsPanel } from "@/components/dashboard/lock-screen-settings-dialog";
import {
  persistGlobalLockScreenConfig,
  readPersistedGlobalLockScreenConfig,
  type LockScreenConfig,
} from "@/layouts/lock-screen-config";

export default function LockScreenPage() {
  const [config, setConfig] = useState<LockScreenConfig>(() =>
    readPersistedGlobalLockScreenConfig(),
  );

  return (
    <div className="mx-auto w-full max-w-[1560px] pb-12">
      <LockScreenSettingsPanel
        initialConfig={config}
        onSave={async (nextConfig) => {
          persistGlobalLockScreenConfig(nextConfig);
          setConfig(nextConfig);
          toast.success("Lock screen updated");
        }}
      />
    </div>
  );
}
