"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { StorefrontImage } from "@/components/storefront-image";
import { useBagItems, type StorefrontBagItem } from "@/lib/bag";
import { localized } from "@/lib/localized";
import { formatMoney } from "@/lib/money";
import type { StorefrontOrder, StorefrontOrderResponse } from "@/types/orders";
import type { StorefrontLocale, StorefrontMoney } from "@/types/storefront";

function multipliedMoney(money: StorefrontMoney, quantity: number): StorefrontMoney | null {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return null;
  return { amount: String(amount * quantity), currency: money.currency };
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

function firstErrorText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = firstErrorText(item);
      if (result) return result;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      const result = firstErrorText(item);
      if (result) return result;
    }
  }
  return null;
}

function orderErrorMessage(payload: unknown, locale: StorefrontLocale): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    const errorText = firstErrorText(record.errors);
    if (errorText) return errorText;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    const detailText = firstErrorText(record.detail);
    if (detailText) return detailText;
  }
  return locale === "sw"
    ? "Oda haikuweza kutumwa. Tafadhali jaribu tena."
    : "The order could not be submitted. Please try again.";
}

export function StorefrontCheckout({
  siteId,
  locale,
}: {
  siteId: string;
  locale: StorefrontLocale;
}) {
  const items = useBagItems(siteId);
  const displayTotal = bagTotal(items);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<StorefrontOrder | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length || submitting) return;

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: String(form.get("fullName") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          deliveryAddress: String(form.get("deliveryAddress") ?? "").trim(),
          note: String(form.get("note") ?? "").trim(),
          items: items.map((item) => ({
            websiteVariantId: item.websiteVariantId,
            offerId: item.offerId,
            quantity: item.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as StorefrontOrderResponse;
      if (!response.ok || !payload.data) {
        setError(orderErrorMessage(payload, locale));
        return;
      }
      setSubmittedOrder(payload.data);
    } catch {
      setError(orderErrorMessage(null, locale));
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <section className="checkout-empty">
        <h1>{locale === "sw" ? "Kikapu chako kiko tupu" : "Your bag is empty"}</h1>
        <p>{locale === "sw" ? "Ongeza bidhaa kabla ya kuendelea na checkout." : "Add products before continuing to checkout."}</p>
        <Link className="checkout-primary-link" href="/products">
          {locale === "sw" ? "Angalia bidhaa" : "Browse products"}
        </Link>
      </section>
    );
  }

  if (submittedOrder) {
    return (
      <section className="checkout-submitted">
        <p className="checkout-eyebrow">{locale === "sw" ? "Oda imepokelewa" : "Order received"}</p>
        <h1>{submittedOrder.orderNumber}</h1>
        <p>
          {locale === "sw"
            ? "Oda imeundwa. Ukurasa kamili wa uthibitisho utaongezwa katika sehemu ya 2C."
            : "The order has been created. The full confirmation page will be added in Part 2C."}
        </p>
        <Link className="checkout-secondary-link" href="/bag">
          {locale === "sw" ? "Rudi kwenye kikapu" : "Back to bag"}
        </Link>
      </section>
    );
  }

  return (
    <section className="checkout-page-content">
      <div className="checkout-heading">
        <p className="checkout-eyebrow">Checkout</p>
        <h1>{locale === "sw" ? "Kamilisha oda yako" : "Complete your order"}</h1>
        <p>
          {locale === "sw"
            ? "Tutapokea oda yako na mfanyabiashara atawasiliana nawe kuhusu malipo na uwasilishaji."
            : "We will receive your order and the merchant will contact you about payment and delivery."}
        </p>
      </div>

      <form className="checkout-layout" onSubmit={handleSubmit}>
        <div className="checkout-form-card">
          <h2>{locale === "sw" ? "Mawasiliano na uwasilishaji" : "Contact & delivery"}</h2>
          <label>
            <span>{locale === "sw" ? "Jina kamili" : "Full name"}</span>
            <input autoComplete="name" maxLength={120} name="fullName" required />
          </label>
          <label>
            <span>{locale === "sw" ? "Simu" : "Phone"}</span>
            <input autoComplete="tel" maxLength={32} name="phone" required type="tel" />
          </label>
          <label>
            <span>{locale === "sw" ? "Barua pepe (si lazima)" : "Email (optional)"}</span>
            <input autoComplete="email" name="email" type="email" />
          </label>
          <label>
            <span>{locale === "sw" ? "Anwani ya uwasilishaji" : "Delivery address"}</span>
            <textarea maxLength={1000} name="deliveryAddress" required rows={4} />
          </label>
          <label>
            <span>{locale === "sw" ? "Maelezo ya oda (si lazima)" : "Order note (optional)"}</span>
            <textarea maxLength={2000} name="note" rows={3} />
          </label>
          {error ? <p className="checkout-error" role="alert">{error}</p> : null}
        </div>

        <aside className="checkout-summary">
          <h2>{locale === "sw" ? "Oda yako" : "Your order"}</h2>
          <div className="checkout-items">
            {items.map((item) => {
              const title = localized(item.title, locale);
              const selections = item.selections
                .map((selection) => localized(selection.value, locale))
                .filter(Boolean)
                .join(" · ");
              const lineTotal = item.price ? multipliedMoney(item.price, item.quantity) : null;

              return (
                <article className="checkout-item" key={item.offerId}>
                  <div className="checkout-item-media">
                    {item.imageUrl ? (
                      <StorefrontImage alt={title} height={140} src={item.imageUrl} width={140} />
                    ) : null}
                  </div>
                  <div className="checkout-item-copy">
                    <strong>{title}</strong>
                    {selections ? <span>{selections}</span> : null}
                    <span>{locale === "sw" ? "Idadi" : "Qty"} {item.quantity}</span>
                  </div>
                  <strong className="checkout-item-total">
                    {lineTotal
                      ? formatMoney(lineTotal, locale)
                      : locale === "sw" ? "Thibitisha bei" : "Confirm price"}
                  </strong>
                </article>
              );
            })}
          </div>

          <div className="checkout-total-row">
            <span>{locale === "sw" ? "Jumla" : "Total"}</span>
            <strong>
              {displayTotal
                ? formatMoney(displayTotal, locale)
                : locale === "sw" ? "Itathibitishwa" : "To be confirmed"}
            </strong>
          </div>
          <p className="checkout-price-note">
            {locale === "sw"
              ? "Bei na upatikanaji vitathibitishwa tena unapotuma oda."
              : "Price and availability are checked again when you place the order."}
          </p>
          <button className="checkout-submit-button" disabled={submitting} type="submit">
            {submitting
              ? locale === "sw" ? "Inatuma..." : "Placing order..."
              : locale === "sw" ? "Tuma oda" : "Place order"}
          </button>
          <Link className="checkout-secondary-link" href="/bag">
            {locale === "sw" ? "Rudi kwenye kikapu" : "Back to bag"}
          </Link>
        </aside>
      </form>
    </section>
  );
}
