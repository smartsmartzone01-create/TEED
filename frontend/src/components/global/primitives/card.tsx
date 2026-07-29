import type { ComponentProps } from "react";

import { cn } from "@/lib/global/class-names";

type CardProps = ComponentProps<"section">;

function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-background/90 p-6",
        "shadow-[0_24px_80px_rgb(4_8_30_/_0.18)] backdrop-blur-xl",
        "sm:p-8",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
export type { CardProps };
