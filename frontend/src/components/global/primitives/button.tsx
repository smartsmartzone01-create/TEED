import { LoaderCircle } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/global/class-names";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md",
    "text-sm font-medium",
    "transition-colors",
    "outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:ring-2",
    "focus-visible:ring-foreground/40",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-background",
    "[&_svg]:pointer-events-none",
    "[&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/85",
        secondary:
          "bg-foreground/10 text-foreground hover:bg-foreground/15",
        outline:
          "border border-foreground/20 bg-background text-foreground hover:bg-foreground/5",
        ghost:
          "text-foreground hover:bg-foreground/5",
        link:
          "h-auto text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        small: "h-9 px-3",
        large: "h-11 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingLabel?: string;
  };

function Button({
  asChild = false,
  children,
  className,
  disabled,
  loading = false,
  loadingLabel,
  size,
  type,
  variant,
  ...props
}: ButtonProps) {
  const styles = cn(
    buttonVariants({ size, variant }),
    className,
  );

  if (asChild) {
    return (
      <Slot className={styles} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      aria-busy={loading || undefined}
      className={styles}
      disabled={disabled || loading}
      type={type ?? "button"}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin"
        />
      ) : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };