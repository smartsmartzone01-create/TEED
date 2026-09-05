import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

export function SiteFooter({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;

  return (
    <footer id="about" className="site-footer">
      {site.newsletter.enabled ? (
        <section className="newsletter page-shell">
          <div>
            <p className="eyebrow">{locale === "sw" ? "Taarifa" : "Updates"}</p>
            <h2>{localized(site.newsletter.title, locale)}</h2>
            <p>{localized(site.newsletter.description, locale)}</p>
          </div>
          <form className="newsletter-form">
            <label className="sr-only" htmlFor="newsletter-email">
              Email
            </label>
            <input id="newsletter-email" type="email" placeholder="you@example.com" disabled />
            <button type="button" disabled>
              {locale === "sw" ? "Jiandikishe" : "Subscribe"}
            </button>
          </form>
        </section>
      ) : null}

      <div className="footer-bottom page-shell">
        <div>
          <strong>{site.displayName}</strong>
          <p>{site.contact.email ?? "Store contact configured by the merchant"}</p>
        </div>
        <p>© {new Date().getFullYear()} {site.displayName}</p>
      </div>
    </footer>
  );
}
