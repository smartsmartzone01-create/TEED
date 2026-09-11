import Link from "next/link";

import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

export function EcommerceClassicFooter({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;
  const whatsappHref = site.contact.whatsapp
    ? `https://wa.me/${site.contact.whatsapp.replace(/\D/g, "")}`
    : undefined;

  return (
    <footer className="commerce-template-footer">
      {site.newsletter.enabled ? (
        <section className="commerce-template-newsletter page-shell">
          <div>
            <p className="eyebrow">{locale === "sw" ? "Taarifa" : "Updates"}</p>
            <h2>{localized(site.newsletter.title, locale)}</h2>
            <p>{localized(site.newsletter.description, locale)}</p>
          </div>
          <form className="commerce-template-newsletter-form">
            <label className="sr-only" htmlFor="commerce-newsletter-email">Email</label>
            <input id="commerce-newsletter-email" type="email" placeholder="you@example.com" disabled />
            <button type="button" disabled>{locale === "sw" ? "Jiandikishe" : "Subscribe"}</button>
          </form>
        </section>
      ) : null}

      <div className="page-shell commerce-template-footer-grid">
        <section>
          <h3>{site.displayName}</h3>
          <p className="commerce-template-footer-copy">
            {locale === "sw"
              ? "Duka lako la mtandaoni, limeundwa kuonyesha bidhaa, huduma na mawasiliano yako kwa uwazi."
              : "Your online storefront for products, services, and direct customer contact."}
          </p>
          <div className="commerce-template-social-links">
            {site.contact.instagram ? <a href={site.contact.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}
            {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a> : null}
          </div>
        </section>

        <section>
          <h3>{locale === "sw" ? "Duka" : "Shop"}</h3>
          <nav className="commerce-template-footer-links" aria-label="Footer navigation">
            {site.navigation.map((item) =>
              isInternalHref(item.href) ? (
                <Link key={item.id} href={item.href}>{localized(item.label, locale)}</Link>
              ) : (
                <a key={item.id} href={item.href}>{localized(item.label, locale)}</a>
              ),
            )}
          </nav>
        </section>

        <section>
          <h3>{locale === "sw" ? "Msaada" : "Support"}</h3>
          <div className="commerce-template-footer-links">
            {whatsappHref ? <a href={whatsappHref}>{locale === "sw" ? "Ongea nasi" : "Chat with us"}</a> : null}
            {site.contact.email ? <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a> : null}
            {site.contact.phone ? <a href={`tel:${site.contact.phone}`}>{site.contact.phone}</a> : null}
          </div>
        </section>

        <section>
          <h3>{locale === "sw" ? "Mawasiliano" : "Contact"}</h3>
          <div className="commerce-template-footer-links">
            {site.contact.phone ? <span>{site.contact.phone}</span> : null}
            {site.contact.email ? <span>{site.contact.email}</span> : null}
            {site.contact.instagram ? <span>Instagram</span> : null}
          </div>
        </section>
      </div>

      <div className="page-shell commerce-template-footer-bottom">
        <p>© {new Date().getFullYear()} {site.displayName}. {locale === "sw" ? "Haki zote zimehifadhiwa." : "All rights reserved."}</p>
        <p>{locale === "sw" ? "Inaendeshwa na Tunakuza Website" : "Powered by Tunakuza Website"}</p>
      </div>
    </footer>
  );
}
