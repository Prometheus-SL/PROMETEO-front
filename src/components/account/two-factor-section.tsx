import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Check,
  Copy,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { authService } from "@/services/auth";

const RECOVERY_CODE_TOTAL = 8;

type TwoFactorStatus = {
  enabled: boolean;
  enabledAt?: string | null;
  recoveryCodesRemaining?: number;
};

function formatEnabledDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function TwoFactorSection() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [disableIntent, setDisableIntent] = useState<"disable" | "reconfigure">(
    "disable",
  );

  const loadStatus = useCallback(async () => {
    try {
      const data = await authService.get2FAStatus();
      setStatus(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSetup = useCallback(async () => {
    setSubmitting(true);
    try {
      const data = await authService.setup2FA();
      setSecret(data.secret);
      setOtpauthUri(data.otpauthUri);
      setToken("");
      setSetupOpen(true);
    } catch (err) {
      toast.error((err as Error).message || "Failed to start 2FA setup");
    } finally {
      setSubmitting(false);
    }
  }, []);

  async function handleConfirm() {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authService.confirm2FA(token);
      const enabledAt = new Date().toISOString();
      setRecoveryCodes(data.recoveryCodes);
      setShowCodes(true);
      setSetupOpen(false);
      setToken("");
      setStatus({
        enabled: true,
        enabledAt,
        recoveryCodesRemaining: data.recoveryCodes.length,
      });
      toast.success("Two-factor authentication enabled");
    } catch (err) {
      toast.error((err as Error).message || "Invalid code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code to continue");
      return;
    }

    const nextIntent = disableIntent;
    let disabled = false;

    setSubmitting(true);
    try {
      await authService.disable2FA(token);
      disabled = true;
      setDisableOpen(false);
      setToken("");
      setStatus({
        enabled: false,
        enabledAt: null,
        recoveryCodesRemaining: 0,
      });

      if (nextIntent === "reconfigure") {
        const data = await authService.setup2FA();
        setSecret(data.secret);
        setOtpauthUri(data.otpauthUri);
        setSetupOpen(true);
        toast.success("Scan the new QR code to finish reconfiguring 2FA");
      } else {
        toast.success("Two-factor authentication disabled");
      }
    } catch (err) {
      if (disabled && nextIntent === "reconfigure") {
        toast.error(
          "2FA was disabled, but a new authenticator setup could not be started.",
        );
      } else {
        toast.error((err as Error).message || "Invalid code");
      }
    } finally {
      setDisableIntent("disable");
      setSubmitting(false);
    }
  }

  async function handleRegenerateRecoveryCodes() {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }

    setSubmitting(true);
    try {
      const data = await authService.regenerateRecoveryCodes(token);
      setRecoveryCodes(data.recoveryCodes);
      setShowCodes(true);
      setRegenerateOpen(false);
      setToken("");
      setStatus((current) =>
        current
          ? {
              ...current,
              recoveryCodesRemaining: data.recoveryCodes.length,
            }
          : {
              enabled: true,
              enabledAt: null,
              recoveryCodesRemaining: data.recoveryCodes.length,
            },
      );
      toast.success("Recovery codes regenerated");
    } catch (err) {
      toast.error((err as Error).message || "Could not regenerate recovery codes");
    } finally {
      setSubmitting(false);
    }
  }

  function openDisableDialog(intent: "disable" | "reconfigure") {
    setDisableIntent(intent);
    setToken("");
    setDisableOpen(true);
  }

  function openRegenerateDialog() {
    setToken("");
    setRegenerateOpen(true);
  }

  function copySecret() {
    void navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyCodes() {
    void navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Recovery codes copied to clipboard");
  }

  if (loading) return null;

  const enabledDateLabel = formatEnabledDate(status?.enabledAt);
  const remainingCodes = Math.max(0, status?.recoveryCodesRemaining ?? 0);

  return (
    <>
      <Card className="flex min-w-0 max-w-full flex-col overflow-hidden rounded-xl">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {status?.enabled ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <ShieldOff className="size-5" />
                )}
                Two-factor authentication
              </CardTitle>
              <CardDescription>
                Add a second step to every sign-in.
              </CardDescription>
            </div>

            <Badge
              variant="outline"
              className={
                status?.enabled
                  ? "shrink-0 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "shrink-0"
              }
            >
              {status?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {status?.enabled ? (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <TwoFactorDetailCard
                  icon={<Smartphone className="size-5" />}
                  iconClassName="text-emerald-400"
                  title="Authenticator app"
                  description={
                    enabledDateLabel
                      ? `Configured on ${enabledDateLabel}`
                      : "Ready for every sign-in."
                  }
                  actionLabel="Reconfigure"
                  actionIcon={<RefreshCw className="size-4" />}
                  onAction={() => openDisableDialog("reconfigure")}
                  disabled={submitting}
                />
                <TwoFactorDetailCard
                  icon={<KeyRound className="size-5" />}
                  iconClassName="text-cyan-400"
                  title="Recovery codes"
                  description={`${remainingCodes} of ${RECOVERY_CODE_TOTAL} unused`}
                  actionLabel="Regenerate"
                  actionIcon={<RefreshCw className="size-4" />}
                  onAction={openRegenerateDialog}
                  disabled={submitting}
                />
              </div>

              <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-[62ch] text-sm text-muted-foreground">
                  If you change phones, reconfigure your authenticator app and
                  save a fresh recovery code set.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 self-start text-destructive hover:text-destructive"
                  onClick={() => openDisableDialog("disable")}
                >
                  Turn off 2FA
                </Button>
              </div>
            </>
          ) : (
            <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border/60 bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  No authenticator app connected
                </p>
                <p className="max-w-[62ch] text-sm text-muted-foreground">
                  Protect your account with one-time codes from Google
                  Authenticator, Authy, 1Password, or a similar app.
                </p>
              </div>
              <Button
                onClick={() => void handleSetup()}
                disabled={submitting}
                className="shrink-0 self-start"
              >
                {submitting ? "Setting up..." : "Enable 2FA"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up two-factor authentication</DialogTitle>
            <DialogDescription>
              Add this secret to your authenticator app and enter the 6-digit
              code to verify the new device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {otpauthUri ? (
              <div className="flex justify-center rounded-2xl border bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`}
                  alt="TOTP QR Code"
                  className="size-48"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Or enter this secret manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-xl border bg-muted px-3 py-2 text-xs font-mono">
                  {secret}
                </code>
                <Button variant="ghost" size="icon" onClick={copySecret}>
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Verification code</p>
              <OtpField value={token} onChange={setToken} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting || token.length !== 6}
            >
              {submitting ? "Verifying..." : "Verify & enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {disableIntent === "reconfigure"
                ? "Reconfigure authenticator app"
                : "Disable two-factor authentication"}
            </DialogTitle>
            <DialogDescription>
              {disableIntent === "reconfigure"
                ? "Enter a valid 6-digit code to remove the current authenticator. We will immediately generate a new QR code for the replacement app or device."
                : "Enter a valid 6-digit code from your authenticator app to confirm this change."}
            </DialogDescription>
          </DialogHeader>
          <OtpField value={token} onChange={setToken} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={disableIntent === "reconfigure" ? "default" : "destructive"}
              onClick={handleDisable}
              disabled={submitting || token.length !== 6}
            >
              {submitting
                ? disableIntent === "reconfigure"
                  ? "Preparing..."
                  : "Disabling..."
                : disableIntent === "reconfigure"
                  ? "Continue"
                  : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate recovery codes</DialogTitle>
            <DialogDescription>
              Enter the current 6-digit code from your authenticator app to
              replace the existing recovery codes with a new set.
            </DialogDescription>
          </DialogHeader>
          <OtpField value={token} onChange={setToken} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegenerateRecoveryCodes}
              disabled={submitting || token.length !== 6}
            >
              {submitting ? "Regenerating..." : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCodes} onOpenChange={setShowCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery codes</DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once
              to access your account if you lose your authenticator device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted p-4">
            {recoveryCodes.map((code) => (
              <code key={code} className="text-center font-mono text-sm">
                {code}
              </code>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCodes}>
              <Copy className="mr-2 size-4" /> Copy all
            </Button>
            <Button onClick={() => setShowCodes(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TwoFactorDetailCard({
  icon,
  iconClassName,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  disabled,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border/60 bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2">
          <div className={iconClassName}>{icon}</div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 self-start"
        onClick={onAction}
        disabled={disabled}
      >
        {actionIcon}
        {actionLabel}
      </Button>
    </div>
  );
}

function OtpField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      className="autofill:bg-transparent autofill:text-foreground data-[has-value=true]:bg-transparent data-[has-value=true]:text-foreground"
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}
