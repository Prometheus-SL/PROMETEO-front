import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { authService } from "@/services/auth";

export function TwoFactorSection() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    enabledAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUri, setOtpauthUri] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  async function handleSetup() {
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
  }

  async function handleConfirm() {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setSubmitting(true);
    try {
      const data = await authService.confirm2FA(token);
      setRecoveryCodes(data.recoveryCodes);
      setShowCodes(true);
      setSetupOpen(false);
      setStatus({ enabled: true, enabledAt: new Date().toISOString() });
      toast.success("Two-factor authentication enabled");
    } catch (err) {
      toast.error((err as Error).message || "Invalid code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    if (token.length !== 6) {
      toast.error("Enter the 6-digit code to disable 2FA");
      return;
    }
    setSubmitting(true);
    try {
      await authService.disable2FA(token);
      setDisableOpen(false);
      setToken("");
      setStatus({ enabled: false });
      toast.success("Two-factor authentication disabled");
    } catch (err) {
      toast.error((err as Error).message || "Invalid code");
    } finally {
      setSubmitting(false);
    }
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

  return (
    <>
      <Card className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security using a TOTP authenticator app.
              </CardDescription>
            </div>
            {status?.enabled ? (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="mr-1 size-3" /> Enabled
              </Badge>
            ) : (
              <Badge variant="outline">
                <ShieldOff className="mr-1 size-3" /> Disabled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status?.enabled ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Enabled{" "}
                {status.enabledAt
                  ? `on ${new Date(status.enabledAt).toLocaleDateString()}`
                  : ""}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setToken("");
                  setDisableOpen(true);
                }}
              >
                Disable 2FA
              </Button>
            </div>
          ) : (
            <Button onClick={handleSetup} disabled={submitting}>
              {submitting ? "Setting up..." : "Enable 2FA"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Add this secret to your authenticator app (Google Authenticator,
              Authy, etc.) and enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {otpauthUri && (
              <div className="flex justify-center rounded-lg border bg-white p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`}
                  alt="TOTP QR Code"
                  className="size-48"
                />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Or enter this secret manually:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border bg-muted px-3 py-2 text-xs font-mono break-all">
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
              <Input
                value={token}
                onChange={(e) =>
                  setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="text-center font-mono text-lg tracking-widest"
              />
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
              {submitting ? "Verifying..." : "Verify & Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter a valid 6-digit code from your authenticator app to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={token}
            onChange={(e) =>
              setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            maxLength={6}
            className="text-center font-mono text-lg tracking-widest"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={submitting || token.length !== 6}
            >
              {submitting ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recovery Codes Dialog */}
      <Dialog open={showCodes} onOpenChange={setShowCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recovery Codes</DialogTitle>
            <DialogDescription>
              Save these codes in a safe place. Each code can only be used once
              to access your account if you lose your authenticator device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted p-4">
            {recoveryCodes.map((code) => (
              <code key={code} className="text-center font-mono text-sm">
                {code}
              </code>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyCodes}>
              <Copy className="mr-2 size-4" /> Copy All
            </Button>
            <Button onClick={() => setShowCodes(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
