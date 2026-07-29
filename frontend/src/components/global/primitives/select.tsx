import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/global/class-names";

type SelectProps = ComponentProps<"select"> & {
  invalid?: boolean;
};

function Select({
  children,
  className,
  invalid = false,
  ...props
}: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border",
          "bg-background/90 px-3 pr-10 text-sm text-foreground",
          "shadow-sm outline-none transition-[border-color,box-shadow]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:border-primary focus-visible:ring-2",
          "focus-visible:ring-primary/20",
          invalid
            ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/20"
            : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
export type { SelectProps };
