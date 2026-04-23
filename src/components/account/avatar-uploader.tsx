import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { API_URL } from "@/lib/api";
import { accountService } from "@/services/account";
import type { AuthUser } from "@/services/auth";

const ACCEPTED_MIME = ["image/jpeg", "image/png"];
const MAX_BYTES = 5 * 1024 * 1024;

type AvatarUploaderProps = {
  avatarUrl: string | null | undefined;
  avatarUpdatedAt: string | null | undefined;
  initials: string;
  onUploaded: (user: AuthUser) => void;
  onRemoved: (user: AuthUser) => void;
};

function buildAvatarSrc(
  avatarUrl: string | null | undefined,
  avatarUpdatedAt: string | null | undefined,
): string | undefined {
  if (!avatarUrl) return undefined;
  const version = avatarUpdatedAt
    ? encodeURIComponent(avatarUpdatedAt)
    : "0";
  return `${API_URL}${avatarUrl}?v=${version}`;
}

export function AvatarUploader({
  avatarUrl,
  avatarUpdatedAt,
  initials,
  onUploaded,
  onRemoved,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const busy = uploading || removing;
  const src = buildAvatarSrc(avatarUrl, avatarUpdatedAt);

  const openFilePicker = useCallback(() => {
    if (busy) return;
    inputRef.current?.click();
  }, [busy]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!ACCEPTED_MIME.includes(file.type)) {
        toast.error("Only JPG and PNG images are accepted.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("The image must be 5 MB or less.");
        return;
      }

      setUploading(true);
      try {
        const user = await accountService.uploadAvatar(file);
        onUploaded(user);
        toast.success("Profile photo updated");
      } catch (err) {
        toast.error(
          (err as Error).message || "Could not update profile photo",
        );
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const handleRemove = useCallback(async () => {
    if (busy) return;
    const confirmed = window.confirm("Remove your profile photo?");
    if (!confirmed) return;

    setRemoving(true);
    try {
      const user = await accountService.removeAvatar();
      onRemoved(user);
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(
        (err as Error).message || "Could not remove profile photo",
      );
    } finally {
      setRemoving(false);
    }
  }, [busy, onRemoved]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        hidden
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={busy}>
          <button
            type="button"
            className="group relative block rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Change profile photo"
          >
            <Avatar className="size-16 border border-border/60 shadow-sm">
              {src ? <AvatarImage src={src} alt="Profile photo" /> : null}
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            >
              <Camera className="size-5" />
            </span>
            {busy ? (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <Spinner className="size-5 text-white" />
              </span>
            ) : null}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={openFilePicker}>
            <ImagePlus className="size-4" />
            Upload new photo
          </DropdownMenuItem>
          {avatarUrl ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleRemove}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Remove photo
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
