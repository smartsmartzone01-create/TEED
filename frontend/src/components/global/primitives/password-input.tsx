"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Input } from "@/components/global/primitives/input";
import { cn } from "@/lib/global/class-names";

type PasswordInputProps = Omit<
  ComponentProps<typeof Input>,
  "type"
> & {
  hideLabel: string;
  showLabel: string;
};

function PasswordInput({
  className,
  hideLabel,
  showLabel,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? hideLabel : showLabel;

  return (
    <div className="relative">
      <Input
        className={cn("pr-11", className)}
        type={visible ? "text" : "password"}
        {...props}
      />

      <button
        aria-label={label}
        className={cn(
          "absolute inset-y-0 right-0 inline-flex w-11",
          "items-center justify-center rounded-r-lg",
          "text-muted-foreground transition-colors",
          "hover:text-foreground focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/30",
        )}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
export type { PasswordInputProps };
