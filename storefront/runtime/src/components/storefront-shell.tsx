import type { CSSProperties, ReactNode } from "react";

import { EcommerceClassicFooter } from "@/components/templates/ecommerce/classic/ecommerce-classic-footer";
import { EcommerceClassicHeader } from "@/components/templates/ecommerce/classic/ecommerce-classic-header";
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
    <div className="ecommerce-classic-template" style={themeStyle}>
      <EcommerceClassicHeader site={site} />
      {children}
      <EcommerceClassicFooter site={site} />
    </div>
  );
}
