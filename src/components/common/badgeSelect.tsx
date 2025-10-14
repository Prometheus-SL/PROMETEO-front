"use client";

import { useId, useMemo, useState } from "react";

import { CheckCircleIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type BadgeSelectableProps = {
  onChange?: (selected: boolean) => void;
  text: string;
  selected?: boolean;
  defaultSelected?: boolean;
  className?: string;
};

const BadgeSelectable = ({
  onChange,
  text,
  selected,
  defaultSelected = false,
  className,
}: BadgeSelectableProps) => {
  const isControlled = useMemo(() => selected !== undefined, [selected]);
  const [uncontrolledSelected, setUncontrolledSelected] =
    useState(defaultSelected);
  const currentSelected = isControlled ? !!selected : uncontrolledSelected;

  const id = useId();

  return (
    <Badge
      variant={currentSelected ? "secondary" : "outline"}
      className={cn(
        "has-focus-visible:border-ring/50 has-focus-visible:ring-ring/50 relative cursor-pointer outline-none has-focus-visible:ring-2",
        className
      )}
    >
      <Checkbox
        id={id}
        className="peer sr-only after:absolute after:inset-0"
        checked={currentSelected}
        onCheckedChange={(checked) => {
          const value = checked === true;
          if (!isControlled) {
            setUncontrolledSelected(value);
          }
          onChange?.(value);
        }}
      />
      <CheckCircleIcon
        className="hidden size-3 text-green-600 peer-data-[state=checked]:block dark:text-green-400"
        aria-hidden="true"
      />
      <label
        htmlFor={id}
        className="cursor-pointer select-none after:absolute after:inset-0"
      >
        {text}
      </label>
    </Badge>
  );
};

export default BadgeSelectable;
