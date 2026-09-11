"use client";

import { useEffect, useState } from "react";

import { StorefrontImage } from "@/components/storefront-image";
import type { StorefrontLocale } from "@/types/storefront";

const slides = [
  {
    id: "upgrade",
    imageUrl: "/templates/ecommerce/classic/slide-1.webp",
    label: { en: "Latest technology", sw: "Teknolojia ya kisasa" },
  },
  {
    id: "choice",
    imageUrl: "/templates/ecommerce/classic/slide-2.webp",
    label: { en: "More ways to choose", sw: "Chaguo zaidi kwako" },
  },
  {
    id: "service",
    imageUrl: "/templates/ecommerce/classic/slide-3.webp",
    label: { en: "Shopping made simple", sw: "Ununuzi ulio rahisi" },
  },
] as const;

export function EcommerceClassicCarousel({ locale }: { locale: StorefrontLocale }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="page-shell commerce-classic-carousel" aria-label={locale === "sw" ? "Matangazo" : "Promotions"}>
      <div className="commerce-classic-carousel-track">
        {slides.map((slide, index) => (
          <article
            key={slide.id}
            className={`commerce-classic-carousel-slide${index === activeIndex ? " is-active" : ""}`}
            aria-hidden={index !== activeIndex}
          >
            <StorefrontImage
              src={slide.imageUrl}
              alt={slide.label[locale]}
              width={1600}
              height={700}
            />
          </article>
        ))}
      </div>

      <div className="commerce-classic-carousel-controls">
        <button
          type="button"
          className="commerce-classic-carousel-arrow"
          onClick={() => setActiveIndex((current) => (current - 1 + slides.length) % slides.length)}
          aria-label={locale === "sw" ? "Tangazo lililotangulia" : "Previous promotion"}
        >
          ‹
        </button>

        <div className="commerce-classic-carousel-dots" role="tablist" aria-label={locale === "sw" ? "Chagua tangazo" : "Choose promotion"}>
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`${locale === "sw" ? "Tangazo" : "Promotion"} ${index + 1}`}
              aria-selected={index === activeIndex}
              role="tab"
            />
          ))}
        </div>

        <button
          type="button"
          className="commerce-classic-carousel-arrow"
          onClick={() => setActiveIndex((current) => (current + 1) % slides.length)}
          aria-label={locale === "sw" ? "Tangazo linalofuata" : "Next promotion"}
        >
          ›
        </button>
      </div>
    </section>
  );
}
