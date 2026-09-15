import { ProductCard } from "@/components/catalog/product-card";
import { EcommerceClassicCategoryStrip } from "@/components/templates/ecommerce/classic/ecommerce-classic-category-strip";
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
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page product-catalog-page">
        <div className="product-catalog-sticky-controls">
          {site.categories?.enabled && site.categories.items.length ? (
            <div className="product-category-showcase">
              <EcommerceClassicCategoryStrip
                items={site.categories.items}
                locale={locale}
                selectedItemId={selectedCategory?.id}
                title={site.categories.title}
                viewAllHref={site.categories.viewAllHref}
                variant="catalog"
              />
            </div>
          ) : null}

          <div className="product-catalog-toolbar">
            <div className="page-shell product-catalog-toolbar-inner">
              <div className="product-filter-summary">
                <span>{locale === "sw" ? "Chuja" : "Filter"}</span>
                <small>{visibleProducts.length} {locale === "sw" ? "bidhaa" : "products"}</small>
              </div>
              <div className="product-toolbar-actions">
                <label className="product-sort-control">
                  <span className="sr-only">{locale === "sw" ? "Chuja bidhaa" : "Filter products"}</span>
                  <select defaultValue="all" aria-label={locale === "sw" ? "Chuja bidhaa" : "Filter products"}>
                    <option value="all">{locale === "sw" ? "Bidhaa zote" : "All products"}</option>
                    <option value="newest">{locale === "sw" ? "Mpya zaidi" : "Newest"}</option>
                    <option value="recommended">{locale === "sw" ? "Zinazopendekezwa" : "Recommended"}</option>
                    <option value="most_clicked">{locale === "sw" ? "Zilizobonyezwa zaidi" : "Most clicked"}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>

        <section className="product-list-section page-shell" aria-label={heading}>
          {visibleProducts.length > 0 ? (
            <div className="catalog-grid catalog-grid-store">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {locale === "sw" ? "Hakuna bidhaa zilizochapishwa kwenye kundi hili bado." : "No published products are available in this category yet."}
            </div>
          )}
        </section>

        {whatsapp ? (
          <a className="product-chat-floating" href={`https://wa.me/${whatsapp}`} rel="noreferrer" target="_blank">
            {locale === "sw" ? "Ongea sasa" : "Chat now"}
          </a>
        ) : (
          <span className="product-chat-floating is-disabled">{locale === "sw" ? "Ongea sasa" : "Chat now"}</span>
        )}
      </main>
    </StorefrontShell>
  );
}
