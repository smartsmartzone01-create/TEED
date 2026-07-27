import { Link } from "@/i18n/navigation";

import { cn } from "@/lib/global/class-names";

type BrandMarkProps = {
  className?: string;
  href?: string;
};

function BrandMark({
  className,
  href = "/",
}: BrandMarkProps) {
  return (
    <Link
      aria-label="TEED home"
      className={cn(
        "inline-flex items-center font-black leading-none tracking-[-0.06em]",
        className,
      )}
      href={href}
    >
      <span aria-hidden="true">
        <span className="text-brand-navy">TE</span>
        <span className="text-brand-orange">ED</span>
      </span>
    </Link>
  );
}

export { BrandMark };
export type { BrandMarkProps };