import Link from "next/link";

import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import type { StorefrontLocale, StorefrontProductListing } from "@/types/storefront";

function lowestVisiblePricedSku(product: StorefrontProductListing) {
  const priced = product.skus.filter((sku) => sku.price !== null);
  const visible = priced.filter((sku) => sku.availability !== "out_of_stock");
  const candidates = visible.length > 0 ? visible : priced;
  return [...candidates].sort((a, b) => Number(a.price!.amount) - Number(b.price!.amount))[0];
}

export function ProductCard({ product, locale }: { product: StorefrontProductListing; locale: StorefrontLocale }) {
  const priceSku = lowestVisiblePricedSku(product);
  const prices = new Set(product.skus.filter((sku) => sku.price !== null).map((sku) => `${sku.price!.currency}:${sku.price!.amount}`));
  const isAvailable = product.skus.some((sku) => sku.availability !== "out_of_stock");
  const imageUrl = product.primaryImageUrl?.trim() ?? "";
  const productTitle = localized(product.title, locale);
  const productDescription = localized(product.shortDescription, locale);
  const priceLabel = priceSku
    ? `${prices.size > 1 ? (locale === "sw" ? "Kuanzia " : "From ") : ""}${formatMoney(priceSku.price!, locale)}`
    : locale === "sw" ? "Wasiliana kwa bei" : "Price on request";

  return (
    <article className="product-card product-card-store" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Link href={`/products/${product.slug}`} prefetch={false}>
        <div className="product-card-media">
          {product.badge ? <span className="product-badge">{localized(product.badge, locale)}</span> : null}
          {imageUrl ? <StorefrontImage src={imageUrl} alt={productTitle} width={640} height={640} /> : (
            <div className="product-image-placeholder" role="img" aria-label={productTitle}>
              <span>{locale === "sw" ? "Picha inakuja hivi karibuni" : "Image coming soon"}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="product-card-copy" style={{ flex: 1 }}>
        <Link href={`/products/${product.slug}`} prefetch={false}>
          <p className="product-brand">{product.brand || "\u00a0"}</p>
          <h3
            style={{
              display: "-webkit-box",
              minHeight: "2.9em",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {productTitle}
          </h3>
          <p className="product-card-description" style={{ minHeight: "2.52em" }}>
            {productDescription || "\u00a0"}
          </p>
        </Link>

        <div className="product-card-price-row" style={{ minHeight: "48px" }}>
          <strong
            style={{
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {priceLabel}
          </strong>
          <span className={isAvailable ? "availability-dot in-stock" : "availability-dot out-of-stock"}>
            {isAvailable ? (locale === "sw" ? "Inapatikana" : "Available") : locale === "sw" ? "Imeisha" : "Sold out"}
          </span>
        </div>
        <p className="product-trade-note" style={{ minHeight: "2.3em" }}>
          {locale === "sw" ? "Pata punguzo kupitia trade-in" : "Get trade-in at a discount"}
        </p>

        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr" }}>
          <Link href={`/products/${product.slug}`} prefetch={false} className="product-buy-button" style={{ minHeight: "42px", width: "100%" }}>
            {locale === "sw" ? "Nunua sasa" : "Buy now"}
          </Link>
          <button
            disabled
            style={{
              background: "#ffffff",
              border: "1px solid #111111",
              borderRadius: "999px",
              color: "#111111",
              font: "inherit",
              fontSize: "0.82rem",
              fontWeight: 800,
              minHeight: "42px",
              opacity: 0.72,
              width: "100%",
            }}
            type="button"
          >
            {locale === "sw" ? "Hifadhi" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
