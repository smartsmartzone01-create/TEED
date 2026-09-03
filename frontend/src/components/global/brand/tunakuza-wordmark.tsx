import { Link } from "@/i18n/navigation";

import { cn } from "@/lib/global/class-names";

type TunakuzaWordmarkProps = {
  className?: string;
  href?: string;
};

function TunakuzaWordmark({
  className,
  href = "/",
}: TunakuzaWordmarkProps) {
  return (
    <Link
      aria-label="Tunakuza"
      className={cn(
        "inline-flex shrink-0 items-center font-semibold leading-none tracking-[-0.025em] text-slate-950 dark:text-white",
        className,
      )}
      href={href}
    >
      <span aria-hidden="true">Tunakuza</span>
    </Link>
  );
}

export { TunakuzaWordmark };
export type { TunakuzaWordmarkProps };
