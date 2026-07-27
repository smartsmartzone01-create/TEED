import type { PropsWithChildren } from "react";

import { cn } from "@/lib/global/class-names";
import styles from "@/styles/marketing/marketing-stage.module.css";

type MarketingStageProps = PropsWithChildren<{
  className?: string;
}>;

function MarketingStage({
  children,
  className,
}: MarketingStageProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-background",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 overflow-hidden",
          styles.background,
        )}
      >
        <span className={cn(styles.blob, styles.navyBlob)} />
        <span className={cn(styles.blob, styles.orangeBlob)} />
        <span className={cn(styles.blob, styles.bridgeBlob)} />
        <span className={cn(styles.blob, styles.lowerBlob)} />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export { MarketingStage };
export type { MarketingStageProps };