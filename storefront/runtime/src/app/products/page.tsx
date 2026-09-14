import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontImage } from "@/components/storefront-image";
import { StorefrontShell } from "@/components/storefront-shell";
import { localized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import { getStorefrontProducts, getStorefrontSite } from "@/services/storefront-api";
import type { StorefrontLocale, StorefrontProductListing } from "@/types/storefront";

function quickPrice(product: StorefrontProductListing, locale: StorefrontLocale) {
  const priced = product.skus.filter((sku) => sku.price !== null);
  const visible = priced.filter((sku) => sku.availability !== "out_of_stock");
  const candidates = visible.length > 0 ? visible : priced;
  const lowest = [...candidates].sort((a, b) => Number(a.price!.amount) - Number(b.price!.amount))[0];
  if (!lowest?.price) return locale === "sw" ? "Ulizia bei" : "Ask for price";
  return formatMoney(lowest.price, locale);
}

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
  const brands = [...new Set(visibleProducts.map((product) => product.brand?.trim()).filter((brand): brand is string => Boolean(brand)))].sort();
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");
  const quickProducts = visibleProducts.slice(0, 8);

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page product-catalog-page page-shell">
        <section className="product-quick-strip" aria-label={locale === "sw" ? "Bidhaa za kufikia haraka" : "Quick access products"}>
          <div className="product-quick-strip-heading">
            <strong>{selectedCategory ? localized(selectedCategory.title, locale) : locale === "sw" ? "Chagua kwa haraka" : "Quick access"}</strong>
            <span>{locale === "sw" ? "Chagua bidhaa na uende moja kwa moja" : "Jump straight to a product"}</span>
          </div>
          <div className="product-quick-strip-rail">
            {quickProducts.length > 0 ? quickProducts.map((product) => {
              const title = localized(product.title, locale);
              const imageUrl = product.primaryImageUrl?.trim() ?? "";
              return (
                <Link className="product-quick-item" href={`/products/${product.slug}`} key={product.id}>
                  <span className="product-quick-media">
                    {imageUrl ? <StorefrontImage alt={title} height={96} src={imageUrl} width={96} /> : <span className="product-quick-placeholder" />}
                  </span>
                  <span className="product-quick-copy">
                    <strong>{title}</strong>
                    <small>{quickPrice(product, locale)}</small>
                  </span>
                </Link>
              );
            }) : <span className="product-quick-empty">{locale === "sw" ? "Hakuna bidhaa za kuonyesha bado." : "No quick products to show yet."}</span>}
          </div>
        </section>

        <div className="product-catalog-toolbar">
          <span className="product-results-count">
            {visibleProducts.length} {locale === "sw" ? "matokeo" : "results"}
          </span>
          <div className="product-toolbar-actions">
            <label className="product-sort-control">
              <span className="sr-only">{locale === "sw" ? "Panga bidhaa" : "Sort products"}</span>
              <select defaultValue="newest" aria-label={locale === "sw" ? "Panga bidhaa" : "Sort products"}>
                <option value="newest">{locale === "sw" ? "Mpya kwanza" : "Newest"}</option>
                <option value="all">{locale === "sw" ? "Bidhaa zote" : "All products"}</option>
              </select>
            </label>
            {whatsapp ? (
              <a className="product-chat-link" href={`https://wa.me/${whatsapp}`} rel="noreferrer" target="_blank">
                {locale === "sw" ? "Ongea nasi" : "Chat with us"}
              </a>
            ) : (
              <span className="product-chat-link is-disabled">{locale === "sw" ? "Ongea nasi" : "Chat with us"}</span>
            )}
          </div>
        </div>

        <div className="product-catalog-layout">
          <aside className="product-filter-sidebar" aria-label={locale === "sw" ? "Chuja bidhaa" : "Filter products"}>
            <h2>{locale === "sw" ? "Chuja kwa" : "Filter by"}</h2>
            <div className="product-filter-stack">
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Inapatikana" : "In stock"}</span>
                <select defaultValue="all"><option value="all">{locale === "sw" ? "Zote" : "All"}</option><option value="yes">{locale === "sw" ? "Ndiyo" : "Yes"}</option><option value="no">{locale === "sw" ? "Hapana" : "No"}</option></select>
              </label>
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Mpya" : "New"}</span>
                <select defaultValue="all"><option value="all">{locale === "sw" ? "Zote" : "All"}</option><option value="yes">{locale === "sw" ? "Ndiyo" : "Yes"}</option><option value="no">{locale === "sw" ? "Hapana" : "No"}</option></select>
              </label>
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Chapa" : "Brand"}</span>
                <select defaultValue="all"><option value="all">{locale === "sw" ? "Zote" : "All"}</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select>
              </label>
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Hifadhi" : "Storage"}</span>
                <select defaultValue="all"><option value="all">{locale === "sw" ? "Zote" : "All"}</option><option value="128">128 GB</option><option value="256">256 GB</option><option value="512">512 GB</option></select>
              </label>
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Bei" : "Price"}</span>
                <select defaultValue="all"><option value="all">{locale === "sw" ? "Zote" : "All"}</option><option value="low">{locale === "sw" ? "Bei ya chini" : "Lower price"}</option><option value="high">{locale === "sw" ? "Bei ya juu" : "Higher price"}</option></select>
              </label>
              <label className="product-filter-group">
                <span>{locale === "sw" ? "Kundi" : "Category"}</span>
                <select defaultValue={selectedCategory?.id ?? "all"}><option value="all">{locale === "sw" ? "Zote" : "All"}</option>{site.categories?.items.map((item) => <option key={item.id} value={item.id}>{localized(item.title, locale)}</option>)}</select>
              </label>
            </div>
            <p className="product-filter-note">{locale === "sw" ? "Vichujio vitaunganishwa na data ya bidhaa katika hatua inayofuata." : "Filters will be connected to live product data in the next phase."}</p>
          </aside>

          <section className="product-list-section" aria-label={heading}>
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
        </div>
      </main>
    </StorefrontShell>
  );
}
