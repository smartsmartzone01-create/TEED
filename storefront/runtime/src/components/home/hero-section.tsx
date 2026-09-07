import Image from "next/image";
import Link from "next/link";

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
            <Link className="button button-primary" href={site.hero.primaryHref}>
              {localized(site.hero.primaryAction, locale)}
            </Link>
            {site.hero.secondaryAction && site.hero.secondaryHref ? (
              <Link className="button button-secondary" href={site.hero.secondaryHref}>
                {localized(site.hero.secondaryAction, locale)}
              </Link>
            ) : null}
          </div>
        </div>

        {site.hero.imageUrl ? (
          <div className="hero-media">
            <Image src={site.hero.imageUrl} alt="" width={1200} height={800} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
