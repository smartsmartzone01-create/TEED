import { localized } from "@/lib/localized";
import type { StorefrontSiteConfig } from "@/types/storefront";

export function HeroSection({ site }: { site: StorefrontSiteConfig }) {
  const locale = site.defaultLocale;

  return (
    <section className="hero-section">
      <div className="page-shell hero-grid">
        <div className="hero-copy">
          {site.hero.eyebrow ? (
            <p className="eyebrow">{localized(site.hero.eyebrow, locale)}</p>
          ) : null}
          <h1>{localized(site.hero.title, locale)}</h1>
          <p className="hero-subtitle">{localized(site.hero.subtitle, locale)}</p>
          <div className="hero-actions">
            <a className="button button-primary" href={site.hero.primaryHref}>
              {localized(site.hero.primaryAction, locale)}
            </a>
            {site.hero.secondaryAction && site.hero.secondaryHref ? (
              <a className="button button-secondary" href={site.hero.secondaryHref}>
                {localized(site.hero.secondaryAction, locale)}
              </a>
            ) : null}
          </div>
        </div>

        {site.hero.imageUrl ? (
          <div className="hero-media">
            <img src={site.hero.imageUrl} alt="" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
