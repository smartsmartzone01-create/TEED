import { ProductCard } from "@/components/catalog/product-card";
import { ProductFilterSelect } from "@/components/catalog/product-filter-select";
import { EcommerceClassicCategoryStrip } from "@/components/templates/ecommerce/classic/ecommerce-classic-category-strip";
import { StorefrontShell } from "@/components/storefront-shell";
import { localized } from "@/lib/localized";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";
import type { StorefrontProductFilter, StorefrontProductListing } from "@/types/storefront";

const VALID_FILTERS = new Set<StorefrontProductFilter>([
  "all",
  "newest",
  "recommended",
  "most_clicked",
]);

function publishedTime(product: StorefrontProductListing) {
  const value = product.publishedAt ? Date.parse(product.publishedAt) : 0;
  return Number.isFinite(value) ? value : 0;
}

function applySystemFilter(products: StorefrontProductListing[], filter: StorefrontProductFilter) {
  if (filter === "newest") {
    return [...products]
      .filter((product) => product.isNew)
      .sort((a, b) => publishedTime(b) - publishedTime(a))
      .slice(0, 5);
  }

  if (filter === "most_clicked") {
    return [...products].sort((a, b) => {
      const byViews = (b.detailViewCount ?? 0) - (a.detailViewCount ?? 0);
      return byViews || publishedTime(b) - publishedTime(a);
    });
  }

  if (filter === "recommended") {
    return [...products].sort((a, b) => {
      const aAvailable = a.skus.some((sku) => sku.availability !== "out_of_stock") ? 1 : 0;
      const bAvailable = b.skus.some((sku) => sku.availability !== "out_of_stock") ? 1 : 0;
      if (aAvailable !== bAvailable) return bAvailable - aAvailable;

      const aImage = a.primaryImageUrl?.trim() ? 1 : 0;
      const bImage = b.primaryImageUrl?.trim() ? 1 : 0;
      if (aImage !== bImage) return bImage - aImage;

      const byViews = (b.detailViewCount ?? 0) - (a.detailViewCount ?? 0);
      return byViews || publishedTime(b) - publishedTime(a);
    });
  }

  return products;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; family?: string; filter?: string }>;
}) {
  const [{ category, family, filter: requestedFilter }, site, products] = await Promise.all([
    searchParams,
    getStorefrontSite(),
    getStorefrontProducts({ fresh: true }),
  ]);
  const locale = site.defaultLocale;
  const activeFilter: StorefrontProductFilter = VALID_FILTERS.has(requestedFilter as StorefrontProductFilter)
    ? (requestedFilter as StorefrontProductFilter)
    : "all";
  const selectedCategory = category
    ? site.categories?.items.find((item) => item.id === category)
    : undefined;
  const selectedFamilyIds = selectedCategory?.familyIds ?? [];
  const categoryProducts = selectedFamilyIds.length
    ? products.filter((product) => product.familyIds?.some((familyId) => selectedFamilyIds.includes(familyId)))
    : family
      ? products.filter((product) => product.familyIds?.includes(family))
      : selectedCategory
        ? []
        : products;
  const visibleProducts = applySystemFilter(categoryProducts, activeFilter);
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
                <ProductFilterSelect locale={locale} value={activeFilter} />
              </div>
            </div>
          </div>
        </div>

        <section className="product-list-section page-shell" aria-label={heading}>
          {visibleProducts.length > 0 ? (
            <div className="catalog-grid catalog-grid-store">
              {visibleProducts.map((product) => (
                <div key={product.id} style={{ position: "relative", minWidth: 0 }}>
                  {product.isNew ? (
                    <span
                      style={{
                        position: "absolute",
                        top: "14px",
                        right: "14px",
                        zIndex: 4,
                        padding: "6px 10px",
                        borderRadius: "999px",
                        background: "#111111",
                        color: "#ffffff",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                      }}
                    >
                      {locale === "sw" ? "Mpya" : "New"}
                    </span>
                  ) : null}
                  <ProductCard product={product} locale={locale} />
                </div>
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
