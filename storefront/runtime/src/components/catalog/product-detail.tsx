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

const hiddenOptionIds = new Set(["model", "brand"]);

function isPurchasable(sku: StorefrontSku): boolean {
  return sku.availability !== "out_of_stock";
}

function availabilityLabel(status: StorefrontSkuAvailability, locale: StorefrontLocale): string {
  if (status === "in_stock") return locale === "sw" ? "Ipo dukani" : "In stock";
  if (status === "low_stock") return locale === "sw" ? "Imebaki chache" : "Low stock";
  return locale === "sw" ? "Imeisha" : "Out of stock";
}

function uniqueImages(images: Array<string | undefined>) {
  return [...new Set(images.map((image) => image?.trim() ?? "").filter(Boolean))];
}

export function ProductDetail({ product, locale }: { product: StorefrontProductListing; locale: StorefrontLocale }) {
  const initialSku = product.skus.find(isPurchasable) ?? product.skus[0];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(initialSku?.options ?? {});
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [hasChosenOption, setHasChosenOption] = useState(false);
  const visibleOptions = useMemo(
    () => product.options.filter((option) => !hiddenOptionIds.has(option.id)),
    [product.options],
  );

  const selectedSku = useMemo(() => {
    return product.skus.find((sku) =>
      visibleOptions.every((option) => sku.options[option.id] === selectedOptions[option.id]),
    );
  }, [product.skus, selectedOptions, visibleOptions]);

  const productTitle = localized(product.title, locale);
  const description = localized(product.description, locale).trim();
  const showcaseImage = product.primaryImageUrl?.trim() ?? "";
  const skuGallery = useMemo(() => {
    if (!selectedSku) return [];
    return uniqueImages([
      ...(selectedSku.imageUrls ?? []),
      selectedSku.imageUrl,
    ]);
  }, [selectedSku]);
  const selectedGallery = useMemo(() => {
    const canShowSkuGallery = visibleOptions.length === 0 || hasChosenOption;
    if (canShowSkuGallery) {
      return uniqueImages([showcaseImage, ...skuGallery]);
    }
    return uniqueImages([showcaseImage || skuGallery[0]]);
  }, [hasChosenOption, showcaseImage, skuGallery, visibleOptions.length]);
  const selectedImage = selectedGalleryImage && selectedGallery.includes(selectedGalleryImage)
    ? selectedGalleryImage
    : selectedGallery[0] ?? "";
  const storyImage = showcaseImage || selectedImage;
  const hasThumbnails = selectedGallery.length > 1;

  function optionValueHasStock(optionId: string, value: string): boolean {
    return product.skus.some((sku) => isPurchasable(sku) && sku.options[optionId] === value);
  }

  function chooseOption(optionId: string, value: string) {
    const proposed = { ...selectedOptions, [optionId]: value };
    const exactMatch = product.skus.find(
      (sku) => isPurchasable(sku) && visibleOptions.every((option) => sku.options[option.id] === proposed[option.id]),
    );
    if (exactMatch) {
      setSelectedOptions(exactMatch.options);
      setHasChosenOption(true);
      setSelectedGalleryImage(showcaseImage || null);
      return;
    }
    const compatibleSku = product.skus.find((sku) => isPurchasable(sku) && sku.options[optionId] === value);
    if (compatibleSku) {
      setSelectedOptions(compatibleSku.options);
      setHasChosenOption(true);
      setSelectedGalleryImage(showcaseImage || null);
    }
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
              {selectedGallery.map((imageUrl, index) => {
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
            {product.brand ? <p className="product-detail-brand">{product.brand}</p> : null}
            <h1>{productTitle}</h1>
            <strong className="product-detail-price">{selectedPrice}</strong>
          </div>

          {visibleOptions.map((option) => (
            <fieldset className="option-group" key={option.id}>
              <legend>{localized(option.name, locale)}</legend>
              <div className="option-values">
                {option.values.map((value) => {
                  const selected = selectedOptions[option.id] === value.value;
                  const available = optionValueHasStock(option.id, value.value);
                  const label = localized(value.label, locale);
                  if (value.colorHex) {
                    return (
                      <button key={value.value} type="button" disabled={!available} className={`option-chip option-chip-color${selected ? " option-chip-active" : ""}`} onClick={() => chooseOption(option.id, value.value)} title={label} aria-label={label}>
                        <span className="color-swatch" style={{ backgroundColor: value.colorHex }} aria-hidden="true" />
                      </button>
                    );
                  }
                  return (
                    <button key={value.value} type="button" disabled={!available} className={`option-chip${selected ? " option-chip-active" : ""}`} onClick={() => chooseOption(option.id, value.value)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="product-detail-save-row">
            <button className="product-detail-save" type="button" aria-label={locale === "sw" ? "Hifadhi bidhaa" : "Save product"}>♡</button>
            <span>{locale === "sw" ? "Hifadhi bidhaa" : "Save product"}</span>
          </div>

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
        {storyImage ? <div className="product-story-media"><StorefrontImage src={storyImage} alt={productTitle} width={1600} height={1100} /></div> : null}
        {visibleOptions.length > 0 ? (
          <div className="product-story-configurations">
            <div className="product-story-config-heading">
              <p className="product-story-eyebrow">{locale === "sw" ? "Chaguo" : "Configurations"}</p>
              <h3>{locale === "sw" ? "Chagua inayokufaa" : "Choose what fits you"}</h3>
            </div>
            <div className="product-story-config-list">
              {visibleOptions.map((option) => (
                <div className="product-story-config-row" key={option.id}>
                  <strong>{localized(option.name, locale)}</strong>
                  <div className="product-story-config-values">
                    {option.values.map((value) => value.colorHex ? (
                      <span className="product-story-color" key={value.value} style={{ backgroundColor: value.colorHex }} title={localized(value.label, locale)} aria-label={localized(value.label, locale)} />
                    ) : <span key={value.value}>{localized(value.label, locale)}</span>)}
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
