import { Link } from "@/i18n/navigation";

import { cn } from "@/lib/global/class-names";

type BrandMarkProps = {
  className?: string;
  href?: string;
  tone?: "adaptive" | "default" | "inverse";
};

function BrandMark({
  className,
  href = "/",
  tone = "default",
}: BrandMarkProps) {
  const firstHalfClassName = {
    adaptive: "text-brand-navy dark:text-white",
    default: "text-brand-navy",
    inverse: "text-white",
  }[tone];

  return (
    <Link
      aria-label="TEED"
      className={cn(
        "inline-flex items-center font-black leading-none tracking-[-0.06em]",
        className,
      )}
      href={href}
    >
      <span aria-hidden="true">
        <span className={firstHalfClassName}>TE</span>
        <span className="text-brand-orange">ED</span>
      </span>
    </Link>
  );
}

export { BrandMark };
export type { BrandMarkProps };
