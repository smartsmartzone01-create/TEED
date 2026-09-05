import Image from "next/image";
import Link from "next/link";

import { formatMoney } from "@/lib/money";
import { localized } from "@/lib/localized";
import type { StorefrontLocale, StorefrontProductListing } from "@/types/storefront";

function lowestVisibleSku(product: StorefrontProductListing) {
  const visible = product.skus.filter((sku) => sku.availability !== "out_of_stock");
  const candidates = visible.length > 0 ? visible : product.skus;

  return [...candidates].sort((a, b) => Number(a.price.amount) - Number(b.price.amount))[0];
}

export function ProductCard({
  product,
  locale,
}: {
  product: StorefrontProductListing;
  locale: StorefrontLocale;
}) {
  const priceSku = lowestVisibleSku(product);
  const prices = new Set(product.skus.map((sku) => `${sku.price.currency}:${sku.price.amount}`));
  const isAvailable = product.skus.some((sku) => sku.availability !== "out_of_stock");
  const imageUrl = product.primaryImageUrl?.trim() ?? "";
  const productTitle = localized(product.title, locale);

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-card-link">
        <div className="product-card-media">
          {product.badge ? <span className="product-badge">{localized(product.badge, locale)}</span> : null}
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={productTitle}
              width={640}
              height={640}
            />
          ) : (
            <div className="product-image-placeholder" role="img" aria-label={productTitle}>
              <span>{locale === "sw" ? "Picha inakuja hivi karibuni" : "Image coming soon"}</span>
            </div>
          )}
        </div>
        <div className="product-card-copy">
          {product.brand ? <p className="product-brand">{product.brand}</p> : null}
          <h3>{productTitle}</h3>
          <p className="product-card-description">{localized(product.shortDescription, locale)}</p>
          <div className="product-card-meta">
            <strong>
              {priceSku ? `${prices.size > 1 ? (locale === "sw" ? "Kuanzia " : "From ") : ""}${formatMoney(priceSku.price, locale)}` : "—"}
            </strong>
            <span className={isAvailable ? "availability-dot in-stock" : "availability-dot out-of-stock"}>
              {isAvailable ? (locale === "sw" ? "Inapatikana" : "Available") : locale === "sw" ? "Imeisha" : "Sold out"}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
