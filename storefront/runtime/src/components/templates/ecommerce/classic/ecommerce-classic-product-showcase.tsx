"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import type {
  StorefrontFeaturedSlide,
  StorefrontLocale,
  StorefrontProductListing,
} from "@/types/storefront";

type ShowcaseSlide = StorefrontFeaturedSlide & {
  product?: StorefrontProductListing;
};

function slideTitle(slide: ShowcaseSlide, locale: StorefrontLocale) {
  const configured = localized(slide.title, locale).trim();
  return configured || (slide.product ? localized(slide.product.title, locale) : "");
}

function slideDescription(slide: ShowcaseSlide, locale: StorefrontLocale) {
  const configured = localized(slide.description, locale).trim();
  return configured || (slide.product ? localized(slide.product.shortDescription, locale) : "");
}

function slideActionLabel(slide: ShowcaseSlide, locale: StorefrontLocale) {
  const configured = localized(slide.actionLabel, locale).trim();
  if (configured) return configured;
  return slide.product ? (locale === "sw" ? "Tazama bidhaa" : "View product") : "";
}

function slideImage(slide: ShowcaseSlide) {
  return slide.imageUrl || slide.product?.primaryImageUrl || "";
}

export function EcommerceClassicProductShowcase({
  locale,
  slides,
  rotationMs,
}: {
  locale: StorefrontLocale;
  slides: ShowcaseSlide[];
  rotationMs: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [rotationMs, slides.length]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  if (!slides.length) return null;

  return (
    <section id="popular" className="commerce-classic-showcase" aria-label={locale === "sw" ? "Bidhaa maalum" : "Featured showcase"}>
      <div className="commerce-classic-showcase-viewport" aria-live="polite">
        <div className="commerce-classic-showcase-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((slide) => {
            const title = slideTitle(slide, locale);
            const description = slideDescription(slide, locale);
            const actionLabel = slideActionLabel(slide, locale);
            const imageUrl = slideImage(slide);
            const actionHref = slide.actionHref || (slide.product ? `/products/${slide.product.slug}` : "");
            const imageFirst = slide.imageSide === "left";

            return (
              <article
                className={`commerce-classic-showcase-slide${imageFirst ? " commerce-classic-showcase-slide-image-left" : ""}`}
                key={slide.id}
                style={{ backgroundColor: slide.backgroundColor, color: slide.textColor }}
              >
                <div className="page-shell commerce-classic-showcase-inner">
                  <div className="commerce-classic-showcase-copy">
                    {slide.product?.brand ? <p className="eyebrow">{slide.product.brand}</p> : null}
                    {title ? <h2>{title}</h2> : null}
                    {description ? <p>{description}</p> : null}
                    {actionLabel && actionHref ? <Link className="button button-primary commerce-classic-showcase-action" href={actionHref}>{actionLabel}</Link> : null}
                  </div>
                  <div className="commerce-classic-showcase-media">
                    {imageUrl ? <StorefrontImage src={imageUrl} alt={title || (locale === "sw" ? "Picha ya bidhaa" : "Featured product image")} width={1400} height={900} /> : <div className="commerce-classic-showcase-media-placeholder" aria-hidden="true" />}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="commerce-classic-showcase-controls page-shell">
          <button aria-label={locale === "sw" ? "Slide iliyotangulia" : "Previous slide"} onClick={() => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)} type="button">‹</button>
          <div className="commerce-classic-showcase-dots">
            {slides.map((slide, index) => (
              <button aria-label={`${locale === "sw" ? "Slide" : "Slide"} ${index + 1}`} className={index === activeIndex ? "is-active" : ""} key={slide.id} onClick={() => setActiveIndex(index)} type="button" />
            ))}
          </div>
          <button aria-label={locale === "sw" ? "Slide inayofuata" : "Next slide"} onClick={() => setActiveIndex((current) => (current + 1) % slides.length)} type="button">›</button>
        </div>
      ) : null}
    </section>
  );
}
