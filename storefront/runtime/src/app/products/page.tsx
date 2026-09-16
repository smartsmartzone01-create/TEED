import Link from "next/link";

import { ProductCatalogGrid } from "@/components/catalog/product-catalog-grid";
import { ProductFilterSelect } from "@/components/catalog/product-filter-select";
import { EcommerceClassicCategoryStrip } from "@/components/templates/ecommerce/classic/ecommerce-classic-category-strip";
import { StorefrontShell } from "@/components/storefront-shell";
import { localized } from "@/lib/localized";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";
import type { StorefrontCategory, StorefrontProductFilter, StorefrontProductListing } from "@/types/storefront";

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

function newestProducts(products: StorefrontProductListing[]) {
  return [...products]
    .sort((a, b) => publishedTime(b) - publishedTime(a))
    .slice(0, 5);
}

function applySystemFilter(products: StorefrontProductListing[], filter: StorefrontProductFilter) {
  if (filter === "newest") {
    return newestProducts(products);
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

function productMatchesCategory(product: StorefrontProductListing, listingIds: string[], familyIds: string[]) {
  if (listingIds.length) return listingIds.includes(product.id);
  if (familyIds.length) return product.familyIds?.some((familyId) => familyIds.includes(familyId)) ?? false;
  return false;
}

function productStripItems(products: StorefrontProductListing[]): StorefrontCategory[] {
  return newestProducts(products).map((product) => ({
    id: `new-product-${product.id}`,
    source: "catalog",
    title: product.title,
    description: product.shortDescription,
    href: `/products/${product.slug}`,
    imageUrl: product.primaryImageUrl?.trim() || undefined,
  }));
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
  const categories = site.categories?.enabled ? site.categories.items : [];
  const selectedCategory = category
    ? categories.find((item) => item.id === category)
    : undefined;
  const selectedListingIds = selectedCategory?.listingIds ?? [];
  const selectedFamilyIds = selectedCategory?.familyIds ?? [];
  const scopedProducts = selectedCategory
    ? products.filter((product) => productMatchesCategory(product, selectedListingIds, selectedFamilyIds))
    : family
      ? products.filter((product) => product.familyIds?.includes(family))
      : products;
  const visibleProducts = applySystemFilter(scopedProducts, activeFilter);
  const stripItems = productStripItems(scopedProducts);
  const allProductsActive = !selectedCategory && !family;
  const heading = selectedCategory
    ? localized(selectedCategory.title, locale)
    : allProductsActive
      ? locale === "sw" ? "Bidhaa zote" : "All products"
      : locale === "sw" ? "Bidhaa" : "Products";
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");
  const notes = locale === "sw"
    ? [
        "Picha za bidhaa ni za kuonyesha; mwonekano halisi unaweza kutofautiana kidogo.",
        "Bei na upatikanaji zinaweza kubadilika kulingana na SKU iliyochaguliwa na hali ya sasa ya bidhaa.",
        "Maelezo ya bidhaa yanaweza kutofautiana kulingana na chaguo, toleo au aina ya SKU iliyochaguliwa.",
      ]
    : [
        "Product images are for presentation; actual appearance may vary slightly.",
        "Price and availability can change depending on the selected SKU and current product status.",
        "Product details may vary by the selected option, version, or SKU configuration.",
      ];
  const filterQuery = activeFilter === "all" ? "" : `&filter=${encodeURIComponent(activeFilter)}`;
  const allProductsHref = activeFilter === "all"
    ? "/products"
    : `/products?filter=${encodeURIComponent(activeFilter)}`;
  const categoryTabStyle = {
    background: "#F1F2F4",
    borderRadius: "999px",
    color: "#333333",
    flex: "0 0 auto",
    fontSize: "0.74rem",
    fontWeight: 400,
    lineHeight: 1.2,
    padding: "10px 18px",
    textDecoration: "none",
  } as const;

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page product-catalog-page">
        {categories.length ? (
          <div className="product-catalog-sticky-controls">
            <div className="product-catalog-toolbar">
              <div className="page-shell" style={{ minWidth: 0, paddingBlock: "7px" }}>
                <nav
                  aria-label={locale === "sw" ? "Makundi ya bidhaa" : "Product categories"}
                  style={{
                    minWidth: 0,
                    overflowX: "auto",
                    padding: "3px 0",
                    scrollbarWidth: "thin",
                  }}
                >
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      gap: "12px",
                      justifyContent: "space-evenly",
                      minWidth: "100%",
                      paddingInline: "12px",
                      width: "max-content",
                    }}
                  >
                    <Link
                      href={allProductsHref}
                      style={{
                        ...categoryTabStyle,
                        border: `1px solid ${allProductsActive ? "#777777" : "#e1e1e1"}`,
                      }}
                    >
                      {locale === "sw" ? "Bidhaa zote" : "All Products"}
                    </Link>
                    {categories.map((item) => {
                      const active = selectedCategory?.id === item.id;
                      return (
                        <Link
                          href={`/products?category=${encodeURIComponent(item.id)}${filterQuery}`}
                          key={item.id}
                          style={{
                            ...categoryTabStyle,
                            border: `1px solid ${active ? "#777777" : "#e1e1e1"}`,
                          }}
                        >
                          {localized(item.title, locale)}
                        </Link>
                      );
                    })}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        ) : null}

        {stripItems.length ? (
          <div className="product-category-showcase">
            <EcommerceClassicCategoryStrip
              items={stripItems}
              locale={locale}
              title={{ en: "Newest products", sw: "Bidhaa mpya" }}
              viewAllHref={selectedCategory ? `/products?category=${encodeURIComponent(selectedCategory.id)}&filter=newest` : family ? `/products?family=${encodeURIComponent(family)}&filter=newest` : "/products?filter=newest"}
              variant="catalog"
            />
          </div>
        ) : null}

        <div className="product-catalog-toolbar">
          <div className="page-shell product-catalog-toolbar-inner" style={{ paddingBlock: "7px" }}>
            <div className="product-filter-summary" style={{ gap: "7px" }}>
              <span
                style={{
                  color: "#555555",
                  fontSize: "0.66rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  textTransform: "none",
                }}
              >
                {heading}
              </span>
              <small style={{ color: "#9a9a9a", fontSize: "0.64rem", fontWeight: 400 }}>
                {visibleProducts.length} {locale === "sw" ? "bidhaa" : "products"}
              </small>
            </div>
            <div className="product-toolbar-actions">
              <ProductFilterSelect locale={locale} value={activeFilter} />
            </div>
          </div>
        </div>

        <section className="product-list-section page-shell" aria-label={heading}>
          {visibleProducts.length > 0 ? (
            <ProductCatalogGrid
              key={`${activeFilter}-${selectedCategory?.id ?? family ?? "all"}`}
              locale={locale}
              paginate={activeFilter !== "newest"}
              products={visibleProducts}
            />
          ) : (
            <div className="empty-state">
              {selectedCategory
                ? locale === "sw"
                  ? "Hakuna bidhaa zilizochapishwa kwenye kundi hili bado."
                  : "No published products are available in this category yet."
                : locale === "sw"
                  ? "Hakuna bidhaa zilizochapishwa bado."
                  : "No published products are available yet."}
            </div>
          )}

          <details style={{ borderTop: "1px solid #e5e5e5", marginTop: "34px", paddingTop: "18px" }}>
            <summary style={{ alignItems: "center", color: "#111111", cursor: "pointer", display: "flex", fontSize: "0.86rem", fontWeight: 400, gap: "8px", listStyle: "none", width: "fit-content" }}>
              <span>{locale === "sw" ? "Tazama maelezo zaidi" : "View more information"}</span>
              <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
              </svg>
            </summary>
            <div style={{ color: "#666666", fontSize: "0.76rem", lineHeight: 1.6, padding: "16px 0 2px" }}>
              {notes.map((note) => <p key={note} style={{ margin: "0 0 10px" }}>* {note}</p>)}
            </div>
          </details>
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
