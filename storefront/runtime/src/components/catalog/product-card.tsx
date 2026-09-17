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
  const priceLabel = priceSku
    ? `${prices.size > 1 ? (locale === "sw" ? "Kuanzia " : "From ") : ""}${formatMoney(priceSku.price!, locale)}`
    : locale === "sw" ? "Wasiliana kwa bei" : "Price on request";

  return (
    <article className="product-card product-card-store">
      <Link
        href={`/products/${product.slug}`}
        prefetch={false}
        style={{ display: "block", flex: "0 0 auto", overflow: "hidden" }}
      >
        <div
          className="product-card-media"
          style={{
            height: "clamp(140px, 22vw, 210px)",
            minHeight: "clamp(140px, 22vw, 210px)",
            maxHeight: "clamp(140px, 22vw, 210px)",
            aspectRatio: "auto",
            overflow: "hidden",
          }}
        >
          {product.badge ? <span className="product-badge">{localized(product.badge, locale)}</span> : null}
          {imageUrl ? <StorefrontImage src={imageUrl} alt={productTitle} width={640} height={640} /> : (
            <div className="product-image-placeholder" role="img" aria-label={productTitle}>
              <span>{locale === "sw" ? "Picha inakuja hivi karibuni" : "Image coming soon"}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="product-card-copy">
        <Link
          href={`/products/${product.slug}`}
          prefetch={false}
          className="product-card-title-link"
          style={{ minHeight: "2.5rem", maxHeight: "2.5rem", overflow: "hidden" }}
        >
          <h3>{productTitle}</h3>
        </Link>

        <div className="product-card-price-row">
          <strong>{priceLabel}</strong>
          <span className={isAvailable ? "availability-dot in-stock" : "availability-dot out-of-stock"}>
            {isAvailable ? (locale === "sw" ? "Inapatikana" : "Available") : locale === "sw" ? "Imeisha" : "Sold out"}
          </span>
        </div>

        <div className="product-card-actions">
          <Link href={`/products/${product.slug}`} prefetch={false} className="product-buy-button">
            {locale === "sw" ? "Nunua sasa" : "Buy now"}
          </Link>
          <button disabled className="product-save-button" type="button">
            {locale === "sw" ? "Hifadhi" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
