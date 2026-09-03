import { TunakuzaLoaderMark } from "@/components/global/brand/tunakuza-loader-mark";
import { cn } from "@/lib/global/class-names";

type BrandLoaderProps = {
  className?: string;
  label?: string;
  size?: "compact" | "page";
};

const sizeClassNames = {
  compact: "h-12 w-12",
  page: "h-20 w-20 sm:h-24 sm:w-24",
} as const;

function BrandLoader({
  className,
  label = "Tunakuza",
  size = "page",
}: BrandLoaderProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex w-full items-center justify-center",
        className,
      )}
      role="status"
    >
      <TunakuzaLoaderMark
        className={cn("select-none", sizeClassNames[size])}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { BrandLoader };
export type { BrandLoaderProps };
