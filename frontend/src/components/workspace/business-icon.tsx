import { cn } from "@/lib/global/class-names";

type BusinessIconProps = {
  className?: string;
  logoUrl: string | null;
  name: string;
  primaryColor: string;
  secondaryColor: string;
};

function getBusinessInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function BusinessIcon({ className, logoUrl, name, primaryColor, secondaryColor }: BusinessIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-bold tracking-wide text-white", className)}
      style={logoUrl ? undefined : { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
    >
      {logoUrl ? (
        // Business logos come from TEED's configured media origin rather than a fixed image host.
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={logoUrl} />
      ) : getBusinessInitials(name)}
    </span>
  );
}

export { BusinessIcon };
