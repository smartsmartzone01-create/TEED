import { ProductCard } from "@/components/catalog/product-card";
import type { StorefrontProductListing, StorefrontSiteConfig } from "@/types/storefront";

export function FeaturedProductsSection({
  site,
  products,
}: {
  site: StorefrontSiteConfig;
  products: StorefrontProductListing[];
}) {
  const locale = site.defaultLocale;

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="featured-section page-shell">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">{locale === "sw" ? "Bidhaa zilizochaguliwa" : "Featured products"}</p>
          <h2>{locale === "sw" ? "Chagua kinachokufaa" : "Find your next pick"}</h2>
        </div>
        <a href="/products" className="text-link">
          {locale === "sw" ? "Tazama bidhaa zote" : "View all products"} →
        </a>
      </div>
      <div className="catalog-grid">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>
    </section>
  );
}
