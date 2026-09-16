import Link from "next/link";

import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import type {
  StorefrontCategory,
  StorefrontProductListing,
  StorefrontSiteConfig,
} from "@/types/storefront";

import { EcommerceClassicCategoryStrip } from "./ecommerce-classic-category-strip";
import { EcommerceClassicProductShowcase } from "./ecommerce-classic-product-showcase";

function publishedTime(product: StorefrontProductListing) {
  if (!product.publishedAt) return 0;
  const value = Date.parse(product.publishedAt);
  return Number.isFinite(value) ? value : 0;
}

export function EcommerceClassicHome({
  site,
  products,
}: {
  site: StorefrontSiteConfig;
  products: StorefrontProductListing[];
}) {
  const locale = site.defaultLocale;
  const showHeroImage = site.hero.layout === "split" && Boolean(site.hero.imageUrl);
  const hasCategories = Boolean(
    site.categories?.enabled && site.categories.items.length > 0,
  );
  const latestProductItems: StorefrontCategory[] = hasCategories
    ? []
    : [...products]
        .sort(
          (left, right) =>
            publishedTime(right) - publishedTime(left) ||
            left.id.localeCompare(right.id),
        )
        .slice(0, 10)
        .map((product) => ({
          id: `latest-${product.id}`,
          source: "catalog",
          listingIds: [product.id],
          title: product.title,
          description: product.shortDescription,
          href: `/products/${product.slug}`,
          imageUrl: product.primaryImageUrl || undefined,
        }));
  const featuredSlides = site.featuredProducts.items.map((slide) => ({
    ...slide,
    product: slide.listingId
      ? products.find((product) => product.id === slide.listingId)
      : undefined,
  }));

  return (
    <main className="commerce-classic-home">
      <section id="hero" className="commerce-classic-hero">
        <div className={`page-shell commerce-classic-hero-inner${showHeroImage ? " commerce-classic-hero-inner-split" : " commerce-classic-hero-inner-text"}`}>
          <div className="commerce-classic-hero-copy">
            {site.hero.eyebrow ? <p className="eyebrow">{localized(site.hero.eyebrow, locale)}</p> : null}
            <h1>{localized(site.hero.title, locale)}</h1>
            {localized(site.hero.subtitle, locale) ? <p>{localized(site.hero.subtitle, locale)}</p> : null}
            <div className="commerce-classic-hero-actions">
              <Link className="button button-primary" href={site.hero.primaryHref}>{localized(site.hero.primaryAction, locale)}</Link>
              {site.hero.secondaryAction && site.hero.secondaryHref ? <Link className="button button-secondary" href={site.hero.secondaryHref}>{localized(site.hero.secondaryAction, locale)}</Link> : null}
            </div>
          </div>
          {showHeroImage && site.hero.imageUrl ? <div className="commerce-classic-hero-media"><StorefrontImage src={site.hero.imageUrl} alt={site.hero.imageAlt ? localized(site.hero.imageAlt, locale) : localized(site.hero.title, locale)} width={1400} height={900} /></div> : null}
        </div>
      </section>

      {site.featuredProducts.enabled && featuredSlides.length ? <EcommerceClassicProductShowcase locale={locale} slides={featuredSlides} rotationMs={site.featuredProducts.rotationMs} /> : null}

      {hasCategories && site.categories ? (
        <EcommerceClassicCategoryStrip
          items={site.categories.items}
          locale={locale}
          title={site.categories.title}
          viewAllHref={site.categories.viewAllHref}
        />
      ) : latestProductItems.length ? (
        <EcommerceClassicCategoryStrip
          items={latestProductItems}
          locale={locale}
          title={{ en: "All products", sw: "Bidhaa zote" }}
          viewAllHref="/products"
        />
      ) : null}

      {site.services.length > 0 ? (
        <section id="services" className="page-shell commerce-classic-services">
          {site.services.map((service, index) => (
            <article key={service.id} className={`commerce-classic-service-card${index % 2 ? " commerce-classic-service-card-reverse" : ""}`}>
              <div className="commerce-classic-service-copy"><p className="eyebrow">{locale === "sw" ? "Huduma" : "Service"}</p><h2>{localized(service.title, locale)}</h2><p>{localized(service.description, locale)}</p></div>
              {service.imageUrl ? <div className="commerce-classic-service-media"><StorefrontImage src={service.imageUrl} alt={localized(service.title, locale)} width={1200} height={800} /></div> : null}
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
