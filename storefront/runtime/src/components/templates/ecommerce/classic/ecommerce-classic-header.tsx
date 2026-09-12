"use client";

import Link from "next/link";
import { useState } from "react";

import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

function Icon({ name }: { name: "bag" | "globe" | "menu" | "search" | "user" | "x" }) {
  const paths = {
    bag: <><path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
  } as const;

  return (
    <svg aria-hidden="true" className="commerce-shell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

export function EcommerceClassicHeader({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const whatsappHref = site.contact.whatsapp
    ? `https://wa.me/${site.contact.whatsapp.replace(/\D/g, "")}`
    : undefined;

  return (
    <header className="commerce-template-header">
      <div className="commerce-template-topbar">
        <div className="page-shell commerce-template-topbar-inner">
          <div className="commerce-template-contact">
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                {locale === "sw" ? "Wasiliana nasi" : "Contact us"}
              </a>
            ) : site.contact.email ? (
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            ) : (
              <span>{site.displayName}</span>
            )}
          </div>
          <div className="commerce-template-languages" aria-label="Supported languages">
            <Icon name="globe" />
            <span>{site.supportedLocales.map((value) => value.toUpperCase()).join(" / ")}</span>
          </div>
        </div>
      </div>

      <div className="page-shell commerce-template-mainbar">
        <Link href="/" className="commerce-template-brand" aria-label={site.displayName}>
          {site.header.logoImageUrl ? (
            <img
              alt={site.displayName}
              className="h-11 w-auto max-w-40 object-contain sm:max-w-48"
              src={site.header.logoImageUrl}
            />
          ) : (
            <>
              <span className="commerce-template-brand-mark" aria-hidden="true">
                {site.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="commerce-template-brand-name">{site.displayName}</span>
            </>
          )}
        </Link>

        <nav className="commerce-template-desktop-nav" aria-label="Primary navigation">
          {site.navigation.map((item) =>
            isInternalHref(item.href) ? (
              <Link key={item.id} href={item.href}>{localized(item.label, locale)}</Link>
            ) : (
              <a key={item.id} href={item.href}>{localized(item.label, locale)}</a>
            ),
          )}
        </nav>

        <div className="commerce-template-actions">
          <button type="button" className="commerce-template-icon-button" aria-label={locale === "sw" ? "Tafuta" : "Search"} onClick={() => setSearchOpen((value) => !value)}>
            <Icon name={searchOpen ? "x" : "search"} />
          </button>
          <button type="button" className="commerce-template-icon-button commerce-template-desktop-action" aria-label={locale === "sw" ? "Akaunti" : "Account"} disabled>
            <Icon name="user" />
          </button>
          <button type="button" className="commerce-template-icon-button commerce-template-desktop-action" aria-label={locale === "sw" ? "Kikapu" : "Bag"} disabled>
            <Icon name="bag" />
          </button>
          <button type="button" className="commerce-template-icon-button commerce-template-mobile-menu-button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <Icon name={menuOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="commerce-template-search-panel">
          <div className="page-shell commerce-template-search-inner">
            <Icon name="search" />
            <input autoFocus type="search" placeholder={locale === "sw" ? "Tafuta bidhaa..." : "Search products..."} aria-label={locale === "sw" ? "Tafuta bidhaa" : "Search products"} />
            <span>{locale === "sw" ? "Utafutaji kamili utaunganishwa kwenye hatua ya katalogi." : "Full search wiring comes with the catalog step."}</span>
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <nav className="commerce-template-mobile-nav page-shell" aria-label="Mobile navigation">
          {site.navigation.map((item) =>
            isInternalHref(item.href) ? (
              <Link key={item.id} href={item.href} onClick={() => setMenuOpen(false)}>{localized(item.label, locale)}</Link>
            ) : (
              <a key={item.id} href={item.href} onClick={() => setMenuOpen(false)}>{localized(item.label, locale)}</a>
            ),
          )}
          {whatsappHref ? <a href={whatsappHref}>{locale === "sw" ? "Wasiliana nasi" : "Contact us"}</a> : null}
        </nav>
      ) : null}
    </header>
  );
}
