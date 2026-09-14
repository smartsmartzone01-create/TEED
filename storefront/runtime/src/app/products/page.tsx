import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontShell } from "@/components/storefront-shell";
import { localized } from "@/lib/localized";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; family?: string }>;
}) {
  const [{ category, family }, site, products] = await Promise.all([
    searchParams,
    getStorefrontSite(),
    getStorefrontProducts(),
  ]);
  const locale = site.defaultLocale;
  const selectedCategory = category
    ? site.categories?.items.find((item) => item.id === category)
    : undefined;
  const selectedFamilyIds = selectedCategory?.familyIds ?? [];
  const visibleProducts = selectedFamilyIds.length
    ? products.filter((product) => product.familyIds?.some((familyId) => selectedFamilyIds.includes(familyId)))
    : family
      ? products.filter((product) => product.familyIds?.includes(family))
      : selectedCategory
        ? []
        : products;
  const heading = selectedCategory
    ? localized(selectedCategory.title, locale)
    : locale === "sw" ? "Bidhaa zote" : "All products";
  const description = selectedCategory && localized(selectedCategory.description, locale)
    ? localized(selectedCategory.description, locale)
    : locale === "sw"
      ? "Kila kadi inaweza kuwakilisha SKU kadhaa za Tunakuza huku mteja akiona bidhaa moja iliyo wazi na rahisi kuchagua."
      : "Each card can group several Tunakuza Commerce SKUs while the customer sees one clear product listing.";

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page page-shell">
        <div className="catalog-heading">
          <p className="eyebrow">{locale === "sw" ? "Duka" : "Shop"}</p>
          <h1>{heading}</h1>
          <p>{description}</p>
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
