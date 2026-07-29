import type { ComponentProps } from "react";

import { cn } from "@/lib/global/class-names";

type InputProps = ComponentProps<"input"> & {
  invalid?: boolean;
};

function Input({
  className,
  invalid = false,
  ...props
}: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-11 w-full rounded-lg border bg-background/90 px-3",
        "text-sm text-foreground shadow-sm outline-none",
        "placeholder:text-muted-foreground/75",
        "transition-[border-color,box-shadow,background-color]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:border-primary focus-visible:ring-2",
        "focus-visible:ring-primary/20",
        invalid
          ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/20"
          : "border-border",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
