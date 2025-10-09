// components/AdminBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1.5 font-medium transition-all border border-yellow-400/60",
        className
      )}
    >
      Admin
    </Badge>
  );
}
