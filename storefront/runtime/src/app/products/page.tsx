import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { StorefrontImage } from "@/components/storefront-image";
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
  const activeFilterLabel = selectedCategory
    ? localized(selectedCategory.title, locale)
    : family
      ? locale === "sw" ? "Familia iliyochaguliwa" : "Selected family"
      : locale === "sw" ? "Bidhaa zote" : "All products";
  const whatsapp = site.contact.whatsapp?.replace(/\D/g, "");
  const quickProducts = visibleProducts.slice(0, 10);

  return (
    <StorefrontShell site={site}>
      <main className="catalog-page product-catalog-page">
        <div className="product-catalog-sticky-controls">
          <section className="product-quick-strip" aria-label={locale === "sw" ? "Bidhaa za kufikia haraka" : "Quick access products"}>
            <div className="page-shell product-catalog-control-inner">
              <div className="product-quick-strip-rail">
                {quickProducts.length > 0 ? quickProducts.map((product) => {
                  const title = localized(product.title, locale);
                  const imageUrl = product.primaryImageUrl?.trim() ?? "";
                  return (
                    <Link className="product-quick-item" href={`/products/${product.slug}`} key={product.id}>
                      <span className="product-quick-media">
                        {imageUrl ? <StorefrontImage alt={title} height={88} src={imageUrl} width={88} /> : <span className="product-quick-placeholder" />}
                      </span>
                      <span className="product-quick-copy">
                        <strong>{title}</strong>
                      </span>
                    </Link>
                  );
                }) : <span className="product-quick-empty">{locale === "sw" ? "Hakuna bidhaa za kuonyesha bado." : "No products to show yet."}</span>}
              </div>
            </div>
          </section>

          <div className="product-catalog-toolbar">
            <div className="page-shell product-catalog-toolbar-inner">
              <div className="product-filter-summary">
                <span>{locale === "sw" ? "Chuja" : "Filter"}</span>
                <strong>{activeFilterLabel}</strong>
                <small>{visibleProducts.length} {locale === "sw" ? "matokeo" : "results"}</small>
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
