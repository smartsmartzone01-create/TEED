import { cn } from "@/lib/global/class-names";

type BrandLoaderProps = {
  className?: string;
  label?: string;
  size?: "compact" | "page";
};

const sizeClassNames = {
  compact: "h-14 w-14",
  page: "h-24 w-24 sm:h-28 sm:w-28",
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
      <img
        alt=""
        aria-hidden="true"
        className={cn(
          "brand-loader-logo select-none object-contain",
          sizeClassNames[size],
        )}
        draggable={false}
        height="198"
        src="/brand/tunakuza-logo.svg"
        width="200"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { BrandLoader };
export type { BrandLoaderProps };
