import Link from "next/link";

import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

function isInternalHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

export function SiteHeader({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;
  const whatsappHref = site.contact.whatsapp
    ? `https://wa.me/${site.contact.whatsapp.replace(/\D/g, "")}`
    : undefined;

  return (
    <header className="site-header">
      <div className="top-bar">
        <div className="page-shell top-bar-inner">
          {whatsappHref ? (
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              {locale === "sw" ? "Wasiliana nasi" : "Contact us"}
            </a>
          ) : (
            <span>{site.contact.email ?? site.displayName}</span>
          )}
          <span className="locale-list" aria-label="Supported languages">
            {site.supportedLocales.map((value) => value.toUpperCase()).join(" / ")}
          </span>
        </div>
      </div>

      <div className="page-shell main-header">
        <Link href="/" className="brand" aria-label={site.displayName}>
          <span className="brand-mark" aria-hidden="true">
            {site.displayName.slice(0, 1).toUpperCase()}
          </span>
          <span>{site.displayName}</span>
        </Link>

        <nav className="primary-nav" aria-label="Primary navigation">
          {site.navigation.map((item) =>
            isInternalHref(item.href) ? (
              <Link key={item.id} href={item.href}>
                {localized(item.label, locale)}
              </Link>
            ) : (
              <a key={item.id} href={item.href}>
                {localized(item.label, locale)}
              </a>
            ),
          )}
        </nav>

        <div className="header-actions" aria-label="Store actions">
          <button type="button" aria-label={locale === "sw" ? "Tafuta" : "Search"}>⌕</button>
          <button type="button" aria-label={locale === "sw" ? "Kikapu" : "Cart"}>Bag</button>
        </div>
      </div>
    </header>
  );
}
