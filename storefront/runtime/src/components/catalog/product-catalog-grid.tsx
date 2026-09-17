"use client";

import { useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import type { StorefrontLocale, StorefrontProductListing } from "@/types/storefront";

const PAGE_SIZE = 8;

export function ProductCatalogGrid({
  locale,
  paginate,
  products,
}: {
  locale: StorefrontLocale;
  paginate: boolean;
  products: StorefrontProductListing[];
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleProducts = paginate ? products.slice(0, visibleCount) : products;
  const hasMore = paginate && visibleCount < products.length;

  return (
    <>
      <div className="catalog-grid catalog-grid-store" style={{ gridAutoRows: "1fr" }}>
        {visibleProducts.map((product) => (
          <div key={product.id} style={{ height: "100%", minWidth: 0, position: "relative" }}>
            {product.isNew ? (
              <span
                style={{
                  background: "#111111",
                  borderRadius: "999px",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "6px 10px",
                  position: "absolute",
                  right: "14px",
                  top: "14px",
                  zIndex: 4,
                }}
              >
                {locale === "sw" ? "Mpya" : "New"}
              </span>
            ) : null}
            <ProductCard product={product} locale={locale} />
          </div>
        ))}
      </div>

      {hasMore ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "30px 0 8px" }}>
          <button
            onClick={() => setVisibleCount((current) => Math.min(current + PAGE_SIZE, products.length))}
            style={{
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #cfcfcf",
              borderRadius: "999px",
              color: "#111111",
              cursor: "pointer",
              display: "inline-flex",
              font: "inherit",
              fontSize: "0.84rem",
              fontWeight: 800,
              gap: "8px",
              minHeight: "44px",
              padding: "0 20px",
            }}
            type="button"
          >
            {locale === "sw" ? "Tazama zaidi" : "View more"}
            <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}
