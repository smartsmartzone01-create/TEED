import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import type { StorefrontProductListing, StorefrontSiteConfig } from "@/types/storefront";

import { EcommerceClassicCarousel } from "./ecommerce-classic-carousel";

export function EcommerceClassicHome({
  site,
  products,
}: {
  site: StorefrontSiteConfig;
  products: StorefrontProductListing[];
}) {
  const locale = site.defaultLocale;

  return (
    <main className="commerce-classic-home">
      <section className="commerce-classic-hero">
        <div className="page-shell commerce-classic-hero-inner">
          <div className="commerce-classic-hero-copy">
            {site.hero.eyebrow ? (
              <p className="eyebrow">{localized(site.hero.eyebrow, locale)}</p>
            ) : null}
            <h1>{localized(site.hero.title, locale)}</h1>
            <p>{localized(site.hero.subtitle, locale)}</p>
            <div className="commerce-classic-hero-actions">
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
            <div className="commerce-classic-hero-media">
              <StorefrontImage
                src={site.hero.imageUrl}
                alt={localized(site.hero.title, locale)}
                width={1400}
                height={900}
              />
            </div>
          ) : null}

          <p className="commerce-classic-hero-motto" aria-hidden="true">
            {locale === "sw" ? "nzuri, bora, bora zaidi" : "good, best, better"}
          </p>
        </div>
      </section>

      <EcommerceClassicCarousel locale={locale} />

      {site.services.length > 0 ? (
        <section id="services" className="page-shell commerce-classic-services">
          {site.services.map((service, index) => (
            <article
              key={service.id}
              className={`commerce-classic-service-card${index % 2 ? " commerce-classic-service-card-reverse" : ""}`}
            >
              <div className="commerce-classic-service-copy">
                <p className="eyebrow">{locale === "sw" ? "Huduma" : "Service"}</p>
                <h2>{localized(service.title, locale)}</h2>
                <p>{localized(service.description, locale)}</p>
              </div>
              {service.imageUrl ? (
                <div className="commerce-classic-service-media">
                  <StorefrontImage
                    src={service.imageUrl}
                    alt={localized(service.title, locale)}
                    width={1200}
                    height={800}
                  />
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {products.length > 0 ? (
        <section className="page-shell commerce-classic-popular">
          <div className="commerce-classic-section-heading">
            <div>
              <p className="eyebrow">{locale === "sw" ? "Chaguo maarufu" : "Popular picks"}</p>
              <h2>{locale === "sw" ? "Bidhaa zinazopendwa sasa" : "What customers are looking at"}</h2>
            </div>
            <Link href="/products" className="text-link">
              {locale === "sw" ? "Tazama bidhaa zote" : "View all products"} →
            </Link>
          </div>
          <div className="commerce-classic-product-row">
            {products.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
