// components/AdminBadge.tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AdminBadge({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 p-0.5 shadow-md scale-85 transition-transform hover:scale-90 ">
      <Badge
        className={cn(
          "bg-background hover:bg-background text-foreground rounded-full border-none",
          className
        )}
      >
        Admin
      </Badge>
    </div>
  );
}
