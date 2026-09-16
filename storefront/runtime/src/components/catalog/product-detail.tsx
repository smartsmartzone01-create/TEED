"use client";

import { useMemo, useState } from "react";

import { StorefrontImage } from "@/components/storefront-image";
import { localized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import type {
  StorefrontLocale,
  StorefrontProductListing,
  StorefrontSku,
  StorefrontSkuAvailability,
} from "@/types/storefront";

function isPurchasable(sku: StorefrontSku): boolean {
  return sku.availability !== "out_of_stock";
}

function availabilityRank(status: StorefrontSkuAvailability): number {
  if (status === "in_stock") return 2;
  if (status === "low_stock") return 1;
  return 0;
}

function availabilityLabel(status: StorefrontSkuAvailability, locale: StorefrontLocale): string {
  if (status === "in_stock") return locale === "sw" ? "Ipo dukani" : "In stock";
  if (status === "low_stock") return locale === "sw" ? "Imebaki chache" : "Low stock";
  return locale === "sw" ? "Imeisha" : "Out of stock";
}

function uniqueImages(images: Array<string | undefined>) {
  return [...new Set(images.map((image) => image?.trim() ?? "").filter(Boolean))];
}

function skuImages(sku: StorefrontSku | undefined) {
  if (!sku) return [];
  return uniqueImages([
    ...(sku.imageUrls ?? []),
    sku.imageUrl,
  ]);
}

function optionValuesAcrossSkus(skus: StorefrontSku[], optionId: string): string[] {
  return [...new Set(
    skus
      .map((sku) => sku.options[optionId]?.trim() ?? "")
      .filter(Boolean),
  )];
}

export function ProductDetail({ product, locale }: { product: StorefrontProductListing; locale: StorefrontLocale }) {
  const initialSku = product.skus.find(isPurchasable) ?? product.skus[0];
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(initialSku?.id ?? null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [hasChosenOption, setHasChosenOption] = useState(false);
  const visibleOptions = useMemo(
    () => product.options.filter((option) => option.values.length > 0),
    [product.options],
  );
  const configurationOptions = useMemo(
    () => visibleOptions.filter((option) => optionValuesAcrossSkus(product.skus, option.id).length > 1),
    [product.skus, visibleOptions],
  );
  const staticOptions = useMemo(
    () => visibleOptions.filter((option) => optionValuesAcrossSkus(product.skus, option.id).length <= 1),
    [product.skus, visibleOptions],
  );
  const selectedSku = useMemo(
    () => product.skus.find((sku) => sku.id === selectedSkuId) ?? initialSku,
    [initialSku, product.skus, selectedSkuId],
  );
  const selectedOptions = selectedSku?.options ?? {};

  const productTitle = localized(product.title, locale);
  const description = localized(product.description, locale).trim();
  const showcaseImage = product.primaryImageUrl?.trim() ?? "";
  const discoverImage = product.discoverImageUrl?.trim() || showcaseImage;
  const storyBlocks = product.storyBlocks ?? [];
  const skuGallery = useMemo(() => skuImages(selectedSku), [selectedSku]);
  const thumbnailImages = useMemo(() => {
    const images = uniqueImages(product.skus.flatMap((sku) => skuImages(sku)));
    return images.filter((imageUrl) => imageUrl !== showcaseImage);
  }, [product.skus, showcaseImage]);
  const staticDetails = useMemo(() => {
    const details: Array<{ id: string; label: string; value: string }> = [];
    const hasBrandOption = staticOptions.some((option) => option.id.trim().toLowerCase() === "brand");
    const brand = product.brand?.trim() ?? "";

    if (brand && !hasBrandOption) {
      details.push({
        id: "brand",
        label: locale === "sw" ? "Chapa" : "Brand",
        value: brand,
      });
    }

    for (const option of staticOptions) {
      const skuValue = optionValuesAcrossSkus(product.skus, option.id)[0];
      const rawValue = skuValue || option.values[0]?.value || "";
      if (!rawValue) continue;
      const matchingValue = option.values.find((value) => value.value === rawValue);
      details.push({
        id: `option-${option.id}`,
        label: localized(option.name, locale),
        value: matchingValue ? localized(matchingValue.label, locale) : rawValue,
      });
    }

    return details;
  }, [locale, product.brand, product.skus, staticOptions]);
  const defaultDisplayImage = hasChosenOption
    ? skuGallery[0] || showcaseImage || thumbnailImages[0] || ""
    : showcaseImage || skuGallery[0] || thumbnailImages[0] || "";
  const selectedImage = selectedGalleryImage && (
    selectedGalleryImage === showcaseImage ||
    thumbnailImages.includes(selectedGalleryImage) ||
    skuGallery.includes(selectedGalleryImage)
  )
    ? selectedGalleryImage
    : defaultDisplayImage;
  const hasThumbnails = thumbnailImages.length > 0;

  function optionValueExists(optionId: string, value: string): boolean {
    return product.skus.some((sku) => sku.options[optionId] === value);
  }

  function chooseOption(optionId: string, value: string) {
    const candidates = product.skus.filter((sku) => sku.options[optionId] === value);
    if (!candidates.length) return;

    let nextSku = candidates[0];
    let bestMatchScore = -1;
    let bestAvailability = -1;
    for (const candidate of candidates) {
      const matchScore = configurationOptions.reduce((score, option) => {
        if (option.id === optionId) return score;
        const currentValue = selectedOptions[option.id];
        if (!currentValue) return score;
        return score + (candidate.options[option.id] === currentValue ? 1 : 0);
      }, 0);
      const candidateAvailability = availabilityRank(candidate.availability);
      if (
        matchScore > bestMatchScore ||
        (matchScore === bestMatchScore && candidateAvailability > bestAvailability)
      ) {
        nextSku = candidate;
        bestMatchScore = matchScore;
        bestAvailability = candidateAvailability;
      }
    }

    setSelectedSkuId(nextSku.id);
    setHasChosenOption(true);
    const nextImages = skuImages(nextSku);
    setSelectedGalleryImage(nextImages[0] || showcaseImage || null);
  }

  const selectedPrice = selectedSku?.price
    ? formatMoney(selectedSku.price, locale)
    : locale === "sw" ? "Wasiliana kwa bei" : "Price on request";

  return (
    <>
      <section className="product-detail product-detail-reference">
        <div className="product-detail-gallery">
          {hasThumbnails ? (
            <div className="product-detail-thumbnails" aria-label={locale === "sw" ? "Picha za bidhaa" : "Product images"}>
              {thumbnailImages.map((imageUrl, index) => {
                const active = imageUrl === selectedImage;
                const imageLabel = locale === "sw" ? `Picha ${index + 1} ya ${productTitle}` : `${productTitle} image ${index + 1}`;
                return (
                  <button
                    aria-label={imageLabel}
                    aria-pressed={active}
                    className={`product-detail-thumbnail${active ? " is-active" : ""}`}
                    key={imageUrl}
                    onClick={() => setSelectedGalleryImage(imageUrl)}
                    style={{ flex: "0 0 auto" }}
                    type="button"
                  >
                    <StorefrontImage src={imageUrl} alt={imageLabel} width={140} height={140} />
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            className="product-detail-media"
            style={{
              background: "#f8f8f8",
              border: "1px solid #eeeeee",
              borderRadius: "18px",
              gridColumn: hasThumbnails ? undefined : "1 / -1",
              height: "clamp(340px, 52vw, 620px)",
              minHeight: 0,
              overflow: "hidden",
              padding: "clamp(16px, 3vw, 28px)",
            }}
          >
            {selectedImage ? (
              <StorefrontImage src={selectedImage} alt={productTitle} width={1100} height={1100} className="product-detail-image" />
            ) : (
              <div className="product-image-placeholder product-detail-image-placeholder" role="img" aria-label={productTitle}>
                <span>{locale === "sw" ? "Picha inakuja hivi karibuni" : "Image coming soon"}</span>
              </div>
            )}
          </div>
        </div>

        <div className="product-detail-copy">
          <div className="product-detail-pricing">
            <h1>{productTitle}</h1>
            <strong className="product-detail-price">{selectedPrice}</strong>
          </div>

          {configurationOptions.map((option) => (
            <fieldset className="option-group" key={option.id}>
              <legend>{localized(option.name, locale)}</legend>
              <div className="option-values">
                {option.values.map((value) => {
                  const selected = selectedOptions[option.id] === value.value;
                  const exists = optionValueExists(option.id, value.value);
                  const label = localized(value.label, locale);
                  if (value.colorHex) {
                    return (
                      <button key={value.value} type="button" disabled={!exists} className={`option-chip option-chip-color${selected ? " option-chip-active" : ""}`} onClick={() => chooseOption(option.id, value.value)} title={label} aria-label={label}>
                        <span className="color-swatch" style={{ backgroundColor: value.colorHex }} aria-hidden="true" />
                      </button>
                    );
                  }
                  return (
                    <button key={value.value} type="button" disabled={!exists} className={`option-chip${selected ? " option-chip-active" : ""}`} onClick={() => chooseOption(option.id, value.value)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {selectedSku ? (
            <div className="product-detail-availability-row">
              <span>{locale === "sw" ? "Hali" : "Status"}</span>
              <strong className={`availability-pill availability-${selectedSku.availability}`}>{availabilityLabel(selectedSku.availability, locale)}</strong>
            </div>
          ) : null}

          <div className="product-detail-actions">
            <button type="button" className="product-detail-buy-now" disabled>{locale === "sw" ? "Nunua sasa" : "Buy now"}</button>
            <button type="button" className="product-detail-add-cart" disabled>{locale === "sw" ? "Ongeza kwenye kikapu" : "Add to bag"}</button>
          </div>
          <p className="product-purchase-note">{locale === "sw" ? "Ununuzi utaunganishwa kwenye hatua inayofuata." : "Purchase actions will be wired in the next phase."}</p>
        </div>
      </section>

      <section className="product-story" aria-label={locale === "sw" ? `Kuhusu ${productTitle}` : `About ${productTitle}`}>
        <div className="product-story-intro">
          <p className="product-story-eyebrow">{locale === "sw" ? "Gundua" : "Discover"}</p>
          <h2>{productTitle}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {discoverImage ? <div className="product-story-media"><StorefrontImage src={discoverImage} alt={productTitle} width={1600} height={1100} /></div> : null}

        {storyBlocks.length > 0 ? (
          <div className="product-story-features" aria-label={locale === "sw" ? "Vipengele vya bidhaa" : "Product features"}>
            {storyBlocks.map((block, index) => {
              const heading = localized(block.heading, locale).trim();
              const body = localized(block.body, locale).trim();
              const imageUrl = block.imageUrl?.trim() ?? "";
              const hasCopy = Boolean(heading || body);
              const featureClassName = [
                "product-story-feature",
                imageUrl ? "has-image" : "text-only",
                imageUrl && !hasCopy ? "image-only" : "",
                imageUrl && hasCopy && index % 2 === 1 ? "image-right" : "",
              ].filter(Boolean).join(" ");

              return (
                <article className={featureClassName} key={block.id}>
                  {imageUrl ? (
                    <div className="product-story-feature-media">
                      <StorefrontImage src={imageUrl} alt={heading || productTitle} width={1200} height={900} />
                    </div>
                  ) : null}
                  {hasCopy ? (
                    <div className="product-story-feature-copy">
                      {heading ? <h3>{heading}</h3> : null}
                      {body ? <p>{body}</p> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {staticDetails.length > 0 ? (
          <div className="product-story-configurations product-story-details">
            <div className="product-story-config-heading">
              <p className="product-story-eyebrow">{locale === "sw" ? "Maelezo" : "Details"}</p>
              <h3>{locale === "sw" ? "Maelezo ya bidhaa" : "Product details"}</h3>
            </div>
            <div className="product-story-config-list">
              {staticDetails.map((detail) => (
                <div className="product-story-config-row" key={detail.id}>
                  <strong>{detail.label}</strong>
                  <div className="product-story-config-values">
                    <span>{detail.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}