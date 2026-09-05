"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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

function availabilityLabel(status: StorefrontSkuAvailability, locale: StorefrontLocale): string {
  if (status === "in_stock") {
    return locale === "sw" ? "Ipo dukani" : "In stock";
  }
  if (status === "low_stock") {
    return locale === "sw" ? "Imebaki chache" : "Low stock";
  }
  return locale === "sw" ? "Imeisha" : "Out of stock";
}

export function ProductDetail({
  product,
  locale,
}: {
  product: StorefrontProductListing;
  locale: StorefrontLocale;
}) {
  const initialSku = product.skus.find(isPurchasable) ?? product.skus[0];
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    initialSku?.options ?? {},
  );

  const selectedSku = useMemo(() => {
    return product.skus.find((sku) =>
      product.options.every((option) => sku.options[option.id] === selectedOptions[option.id]),
    );
  }, [product.options, product.skus, selectedOptions]);

  const selectedImage = selectedSku?.imageUrl?.trim() || product.primaryImageUrl?.trim() || "";
  const productTitle = localized(product.title, locale);

  function optionValueHasStock(optionId: string, value: string): boolean {
    return product.skus.some(
      (sku) => isPurchasable(sku) && sku.options[optionId] === value,
    );
  }

  function chooseOption(optionId: string, value: string) {
    const proposed = { ...selectedOptions, [optionId]: value };
    const exactMatch = product.skus.find(
      (sku) =>
        isPurchasable(sku) &&
        product.options.every((option) => sku.options[option.id] === proposed[option.id]),
    );

    if (exactMatch) {
      setSelectedOptions(proposed);
      return;
    }

    const compatibleSku = product.skus.find(
      (sku) => isPurchasable(sku) && sku.options[optionId] === value,
    );

    if (compatibleSku) {
      setSelectedOptions(compatibleSku.options);
    }
  }

  return (
    <div className="product-detail">
      <div className="product-detail-media">
        {selectedImage ? (
          <Image
            src={selectedImage}
            alt={productTitle}
            width={960}
            height={960}
            className="product-detail-image"
          />
        ) : (
          <div
            className="product-image-placeholder product-detail-image-placeholder"
            role="img"
            aria-label={productTitle}
          >
            <span>{locale === "sw" ? "Picha inakuja hivi karibuni" : "Image coming soon"}</span>
          </div>
        )}
      </div>

      <div className="product-detail-copy">
        {product.brand ? <p className="product-brand">{product.brand}</p> : null}
        <h1>{productTitle}</h1>
        <p className="product-detail-description">{localized(product.description, locale)}</p>

        {product.options.map((option) => (
          <fieldset className="option-group" key={option.id}>
            <legend>{localized(option.name, locale)}</legend>
            <div className="option-values">
              {option.values.map((value) => {
                const selected = selectedOptions[option.id] === value.value;
                const available = optionValueHasStock(option.id, value.value);

                return (
                  <button
                    key={value.value}
                    type="button"
                    disabled={!available}
                    className={`option-chip${selected ? " option-chip-active" : ""}`}
                    onClick={() => chooseOption(option.id, value.value)}
                  >
                    {value.colorHex ? (
                      <span className="color-swatch" style={{ backgroundColor: value.colorHex }} aria-hidden="true" />
                    ) : null}
                    {localized(value.label, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {selectedSku ? (
          <div className="sku-summary">
            <div>
              <span className="sku-label">SKU</span>
              <strong>{selectedSku.sku}</strong>
            </div>
            <div>
              <span className="sku-label">{locale === "sw" ? "Bei" : "Price"}</span>
              <strong className="selected-price">{formatMoney(selectedSku.price, locale)}</strong>
            </div>
            <span className={`availability-pill availability-${selectedSku.availability}`}>
              {availabilityLabel(selectedSku.availability, locale)}
            </span>
          </div>
        ) : (
          <div className="sku-summary sku-missing">
            {locale === "sw"
              ? "Mchanganyiko huu haujaunganishwa na SKU ya dukani."
              : "This combination is not backed by a storefront SKU."}
          </div>
        )}

        <button
          type="button"
          className="button button-primary product-add-button"
          disabled
          aria-describedby="cart-roadmap"
        >
          {locale === "sw" ? "Ongeza kwenye kikapu" : "Add to bag"}
        </button>
        <p className="product-purchase-note" id="cart-roadmap">
          {locale === "sw"
            ? "Kikapu kitaunganishwa kwenye hatua inayofuata; kwa sasa hakuna oda inayotengenezwa."
            : "Cart wiring comes next; no order is created from this preview yet."}
        </p>
      </div>
    </div>
  );
}
