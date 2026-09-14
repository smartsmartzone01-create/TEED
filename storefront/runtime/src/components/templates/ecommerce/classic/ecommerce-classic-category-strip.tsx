"use client";

import Link from "next/link";
import { useRef } from "react";

import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import type { LocalizedText, StorefrontCategory, StorefrontLocale } from "@/types/storefront";

export function EcommerceClassicCategoryStrip({
  locale,
  title,
  items,
  viewAllHref,
}: {
  locale: StorefrontLocale;
  title: LocalizedText;
  items: StorefrontCategory[];
  viewAllHref: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    railRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  }

  if (!items.length) return null;

  return (
    <section className="commerce-classic-categories page-shell" aria-label={localized(title, locale)}>
      <div className="commerce-classic-categories-heading">
        <h2>{localized(title, locale)}</h2>
        <Link className="text-link" href={viewAllHref}>
          {locale === "sw" ? "Tazama bidhaa zote" : "View all products"} →
        </Link>
      </div>

      <div className="commerce-classic-categories-scroller">
        <button
          aria-label={locale === "sw" ? "Sogeza makundi kushoto" : "Scroll categories left"}
          className="commerce-classic-category-chevron commerce-classic-category-chevron-left"
          onClick={() => scroll(-1)}
          type="button"
        >
          ‹
        </button>
        <div className="commerce-classic-category-rail" ref={railRef}>
          {items.map((item) => (
            <Link className="commerce-classic-category-item" href={item.href} key={item.id}>
              <div className="commerce-classic-category-media">
                {item.imageUrl ? (
                  <StorefrontImage
                    alt={localized(item.title, locale)}
                    height={220}
                    src={item.imageUrl}
                    width={260}
                  />
                ) : (
                  <span aria-hidden="true" className="commerce-classic-category-placeholder" />
                )}
              </div>
              <div className="commerce-classic-category-copy">
                <h3>{localized(item.title, locale)}</h3>
                {localized(item.description, locale) ? <p>{localized(item.description, locale)}</p> : null}
              </div>
            </Link>
          ))}
        </div>
        <button
          aria-label={locale === "sw" ? "Sogeza makundi kulia" : "Scroll categories right"}
          className="commerce-classic-category-chevron commerce-classic-category-chevron-right"
          onClick={() => scroll(1)}
          type="button"
        >
          ›
        </button>
      </div>
    </section>
  );
}
