import type { CSSProperties, ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { StorefrontSiteConfig } from "@/types/storefront";

export function StorefrontShell({
  site,
  children,
}: {
  site: StorefrontSiteConfig;
  children: ReactNode;
}) {
  const themeStyle = {
    "--storefront-accent": site.theme.primaryColor,
    "--storefront-surface": site.theme.surfaceColor,
    "--storefront-text": site.theme.textColor,
  } as CSSProperties;

  return (
    <div style={themeStyle}>
      <SiteHeader site={site} />
      {children}
      <SiteFooter site={site} />
    </div>
  );
}
