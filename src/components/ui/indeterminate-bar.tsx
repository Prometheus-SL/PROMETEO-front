import { memo } from "react";
import { cn } from "@/lib/utils";
import "./indeterminate-bar.css";

interface IndeterminateBarProps {
  className?: string;
}

function IndeterminateBarBase({ className }: IndeterminateBarProps) {
  return (
    <div
      className={cn("pmt-indeterminate-track", className)}
      role="progressbar"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="pmt-indeterminate-bar" />
    </div>
  );
}

export const IndeterminateBar = memo(IndeterminateBarBase);
