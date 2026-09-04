import { Sparkles } from "lucide-react";

import { cn } from "@/lib/global/class-names";

type KuzaAIIconProps = {
  className?: string;
};

function KuzaAIIcon({ className }: KuzaAIIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950",
        className,
      )}
    >
      <Sparkles className="size-4" strokeWidth={2.2} />
    </span>
  );
}

export { KuzaAIIcon };
