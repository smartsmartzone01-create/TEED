"use client";

import Link from "next/link";

import { StorefrontImage } from "@/components/storefront-image";
import {
  clearBag,
  removeBagItem,
  updateBagItemQuantity,
  useBagItems,
  type StorefrontBagItem,
} from "@/lib/bag";
import { localized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import type { StorefrontLocale, StorefrontMoney } from "@/types/storefront";

function multipliedMoney(
  money: StorefrontMoney,
  quantity: number,
): StorefrontMoney | null {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return null;
  return {
    amount: String(amount * quantity),
    currency: money.currency,
  };
}

function bagTotal(items: StorefrontBagItem[]): StorefrontMoney | null {
  if (!items.length || items.some((item) => !item.price)) return null;

  const currency = items[0].price?.currency;
  if (!currency) return null;

  let amount = 0;
  for (const item of items) {
    if (!item.price || item.price.currency !== currency) return null;
    const unitAmount = Number(item.price.amount);
    if (!Number.isFinite(unitAmount)) return null;
    amount += unitAmount * item.quantity;
  }

  return { amount: String(amount), currency };
}

export function StorefrontBag({
  siteId,
  locale,
}: {
  siteId: string;
  locale: StorefrontLocale;
}) {
  const items = useBagItems(siteId);
  const total = bagTotal(items);

  if (!items.length) {
    return (
      <section className="bag-empty">
        <h1>{locale === "sw" ? "Kikapu chako kiko tupu" : "Your bag is empty"}</h1>
        <p>
          {locale === "sw"
            ? "Chagua bidhaa na itaonekana hapa."
            : "Choose a product and it will appear here."}
        </p>
        <Link className="bag-primary-link" href="/products">
          {locale === "sw" ? "Angalia bidhaa" : "Browse products"}
        </Link>
      </section>
    );
  }

  return (
    <section className="bag-page-content">
      <div className="bag-heading-row">
        <div>
          <p className="bag-eyebrow">{locale === "sw" ? "Kikapu" : "Bag"}</p>
          <h1>{locale === "sw" ? "Kikapu chako" : "Your Bag"}</h1>
        </div>
        <button className="bag-clear-button" type="button" onClick={() => clearBag(siteId)}>
          {locale === "sw" ? "Ondoa zote" : "Clear bag"}
        </button>
      </div>

      <div className="bag-layout">
        <div className="bag-items">
          {items.map((item) => {
            const title = localized(item.title, locale);
            const selectionText = item.selections
              .map((selection) => localized(selection.value, locale))
              .filter(Boolean)
              .join(" · ");
            const lineMoney = item.price
              ? multipliedMoney(item.price, item.quantity)
              : null;

            return (
              <article className="bag-item" key={item.offerId}>
                <Link className="bag-item-media" href={`/products/${item.productSlug}`}>
                  {item.imageUrl ? (
                    <StorefrontImage
                      alt={title}
                      className="bag-item-image"
                      height={240}
                      src={item.imageUrl}
                      width={240}
                    />
                  ) : (
                    <span className="bag-item-image-placeholder">
                      {locale === "sw" ? "Hakuna picha" : "No image"}
                    </span>
                  )}
                </Link>

                <div className="bag-item-copy">
                  <div className="bag-item-main">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="bag-item-title">
                        {title}
                      </Link>
                      {selectionText ? <p className="bag-item-options">{selectionText}</p> : null}
                    </div>
                    <strong className="bag-item-unit-price">
                      {item.price
                        ? formatMoney(item.price, locale)
                        : locale === "sw" ? "Wasiliana kwa bei" : "Price on request"}
                    </strong>
                  </div>

                  <div className="bag-item-controls">
                    <label className="bag-quantity-field">
                      <span>{locale === "sw" ? "Idadi" : "Qty"}</span>
                      <input
                        aria-label={locale === "sw" ? `Idadi ya ${title}` : `${title} quantity`}
                        min={1}
                        onChange={(event) => {
                          const quantity = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(quantity) && quantity > 0) {
                            updateBagItemQuantity(siteId, item.offerId, quantity);
                          }
                        }}
                        type="number"
                        value={item.quantity}
                      />
                    </label>

                    <div className="bag-item-subtotal">
                      <span>{locale === "sw" ? "Jumla ndogo" : "Subtotal"}</span>
                      <strong>
                        {lineMoney
                          ? formatMoney(lineMoney, locale)
                          : locale === "sw" ? "Wasiliana kwa bei" : "Price on request"}
                      </strong>
                    </div>

                    <button
                      className="bag-remove-button"
                      type="button"
                      onClick={() => removeBagItem(siteId, item.offerId)}
                    >
                      {locale === "sw" ? "Ondoa" : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="bag-summary" aria-label={locale === "sw" ? "Muhtasari wa kikapu" : "Bag summary"}>
          <div className="bag-summary-total">
            <span>{locale === "sw" ? "Jumla" : "Total"}</span>
            <strong>
              {total
                ? formatMoney(total, locale)
                : locale === "sw" ? "Thibitisha bei wakati wa kuagiza" : "Confirm price at checkout"}
            </strong>
          </div>
          <button className="bag-checkout-button" type="button" disabled>
            {locale === "sw" ? "Endelea kulipa" : "Proceed to Checkout"}
          </button>
          <p className="bag-checkout-note">
            {locale === "sw"
              ? "Checkout itaunganishwa kwenye sehemu inayofuata ya utekelezaji."
              : "Checkout will be wired in the next implementation part."}
          </p>
          <Link className="bag-continue-link" href="/products">
            {locale === "sw" ? "Endelea kununua" : "Continue shopping"}
          </Link>
        </aside>
      </div>
    </section>
  );
}
