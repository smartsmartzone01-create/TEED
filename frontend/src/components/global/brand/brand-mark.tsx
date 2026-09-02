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
  return (
    <Link
      aria-label="Tunakuza"
      className={cn(
        "inline-flex h-14 w-14 shrink-0 items-center justify-center",
        className,
      )}
      data-tone={tone}
      href={href}
    >
      <img
        alt=""
        aria-hidden="true"
        className="h-full w-full select-none object-contain"
        draggable={false}
        height="198"
        src="/brand/tunakuza-logo.svg"
        width="200"
      />
    </Link>
  );
}

export { BrandMark };
export type { BrandMarkProps };
