"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  const [trackIndex, setTrackIndex] = useState(0);
  const [animateTrack, setAnimateTrack] = useState(true);
  const hasLoop = slides.length > 1;
  const loopSlides = hasLoop ? [...slides, slides[0]!] : slides;
  const activeIndex = trackIndex === slides.length ? 0 : Math.min(trackIndex, slides.length - 1);

  const resetLoop = useCallback(() => {
    if (!hasLoop || trackIndex !== slides.length) return;
    setAnimateTrack(false);
    setTrackIndex(0);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimateTrack(true));
    });
  }, [hasLoop, slides.length, trackIndex]);

  useEffect(() => {
    if (!hasLoop) return;
    const timer = window.setInterval(() => {
      setTrackIndex((current) => current < slides.length ? current + 1 : current);
    }, rotationMs);
    return () => window.clearInterval(timer);
  }, [hasLoop, rotationMs, slides.length]);

  useEffect(() => {
    if (!hasLoop || trackIndex !== slides.length) return;
    const fallback = window.setTimeout(resetLoop, 700);
    return () => window.clearTimeout(fallback);
  }, [hasLoop, resetLoop, slides.length, trackIndex]);

  if (!slides.length) return null;

  return (
    <section id="popular" className="commerce-classic-showcase" aria-label={locale === "sw" ? "Bidhaa maalum" : "Featured showcase"}>
      <div className="page-shell commerce-classic-showcase-bridge">
        <p className="eyebrow">{locale === "sw" ? "Chaguo maalum" : "Featured"}</p>
        <h2>{locale === "sw" ? "Bidhaa maalum" : "Featured products"}</h2>
      </div>

      <div className="commerce-classic-showcase-viewport" aria-live="polite">
        <div
          className="commerce-classic-showcase-track"
          onTransitionEnd={resetLoop}
          style={{
            transform: `translateX(-${trackIndex * 100}%)`,
            transition: animateTrack ? undefined : "none",
          }}
        >
          {loopSlides.map((slide, index) => {
            const title = slideTitle(slide, locale);
            const description = slideDescription(slide, locale);
            const actionLabel = slideActionLabel(slide, locale);
            const imageUrl = slideImage(slide);
            const actionHref = slide.actionHref || (slide.product ? `/products/${slide.product.slug}` : "");
            const imageFirst = slide.imageSide === "left";

            return (
              <article
                className={`commerce-classic-showcase-slide${imageFirst ? " commerce-classic-showcase-slide-image-left" : ""}`}
                key={`${slide.id}-${index}`}
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

      {hasLoop ? (
        <div className="commerce-classic-showcase-controls page-shell">
          <div className="commerce-classic-showcase-dots" aria-hidden="true">
            {slides.map((slide, index) => (
              <span className={index === activeIndex ? "is-active" : ""} key={slide.id} />
            ))}
          </div>
          <button aria-label={locale === "sw" ? "Slide inayofuata" : "Next slide"} disabled={trackIndex === slides.length} onClick={() => setTrackIndex((current) => current < slides.length ? current + 1 : current)} type="button">›</button>
        </div>
      ) : null}
    </section>
  );
}
