import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontShell } from "@/components/storefront-shell";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function ProductsPage() {
  const [site, products] = await Promise.all([getStorefrontSite(), getStorefrontProducts()]);
  const locale = site.defaultLocale;

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

        {products.length > 0 ? (
          <div className="catalog-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {locale === "sw" ? "Hakuna bidhaa zilizochapishwa bado." : "No products have been published yet."}
          </div>
        )}
      </main>
    </StorefrontShell>
  );
}
