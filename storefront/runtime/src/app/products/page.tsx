import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ family?: string }>;
}) {
  const [{ family }, site, products] = await Promise.all([
    searchParams,
    getStorefrontSite(),
    getStorefrontProducts(),
  ]);
  const locale = site.defaultLocale;
  const visibleProducts = family
    ? products.filter((product) => product.familyIds?.includes(family))
    : products;

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page page-shell">
        <div className="catalog-heading">
          <p className="eyebrow">{locale === "sw" ? "Duka" : "Shop"}</p>
          <h1>{locale === "sw" ? "Bidhaa zote" : "All products"}</h1>
          <p>
            {locale === "sw"
              ? "Kila kadi inaweza kuwakilisha SKU kadhaa za Tunakuza huku mteja akiona bidhaa moja iliyo wazi na rahisi kuchagua."
              : "Each card can group several Tunakuza Commerce SKUs while the customer sees one clear product listing."}
          </p>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="catalog-grid">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {locale === "sw" ? "Hakuna bidhaa zilizochapishwa kwenye kundi hili bado." : "No published products are available in this category yet."}
          </div>
        )}
      </main>
    </StorefrontShell>
  );
}
