"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import type { LocalizedText, StorefrontLocale, StorefrontProductListing } from "@/types/storefront";
import { localized } from "@/lib/localized";

export function EcommerceClassicProductShowcase({
  locale,
  products,
  title,
  rotationMs,
}: {
  locale: StorefrontLocale;
  products: StorefrontProductListing[];
  title: LocalizedText;
  rotationMs: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (products.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % products.length);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [products.length, rotationMs]);

  if (!products.length) return null;

  return (
    <section id="popular" className="page-shell commerce-classic-showcase">
      <div className="commerce-classic-showcase-heading">
        <div>
          <p className="eyebrow">{locale === "sw" ? "Chaguo letu" : "Our picks"}</p>
          <h2>{localized(title, locale)}</h2>
        </div>
        <span>{locale === "sw" ? "Hubadilika kila sekunde 5" : "Changes every 5 seconds"}</span>
      </div>

      <div className="commerce-classic-showcase-viewport" aria-live="polite">
        <div className="commerce-classic-showcase-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {products.map((product) => (
            <div className="commerce-classic-showcase-slide" key={product.id}>
              <ProductCard product={product} locale={locale} />
            </div>
          ))}
        </div>
      </div>

      {products.length > 1 ? (
        <div className="commerce-classic-showcase-controls">
          <button aria-label={locale === "sw" ? "Bidhaa iliyotangulia" : "Previous product"} onClick={() => setActiveIndex((current) => (current - 1 + products.length) % products.length)} type="button">‹</button>
          <div className="commerce-classic-showcase-dots">
            {products.map((product, index) => (
              <button aria-label={`${locale === "sw" ? "Bidhaa" : "Product"} ${index + 1}`} className={index === activeIndex ? "is-active" : ""} key={product.id} onClick={() => setActiveIndex(index)} type="button" />
            ))}
          </div>
          <button aria-label={locale === "sw" ? "Bidhaa inayofuata" : "Next product"} onClick={() => setActiveIndex((current) => (current + 1) % products.length)} type="button">›</button>
        </div>
      ) : null}
    </section>
  );
}
