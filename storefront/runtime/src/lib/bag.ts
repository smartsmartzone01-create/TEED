"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { LocalizedText, StorefrontMoney } from "@/types/storefront";

export type StorefrontBagSelection = {
  id: string;
  name: LocalizedText;
  value: LocalizedText;
};

export type StorefrontBagItem = {
  offerId: string;
  listingId: string;
  productSlug: string;
  title: LocalizedText;
  websiteVariantId: string;
  sku: string;
  options: Record<string, string>;
  selections: StorefrontBagSelection[];
  price: StorefrontMoney | null;
  imageUrl?: string;
  quantity: number;
};

const BAG_STORAGE_PREFIX = "tunakuza:storefront-bag:v1";
const BAG_CHANGED_EVENT = "tunakuza:storefront-bag-changed";
const EMPTY_BAG: StorefrontBagItem[] = [];
const bagCache = new Map<string, StorefrontBagItem[]>();

function storageKey(siteId: string) {
  return `${BAG_STORAGE_PREFIX}:${siteId}`;
}

function readStoredBag(siteId: string): StorefrontBagItem[] {
  if (typeof window === "undefined") return EMPTY_BAG;

  try {
    const stored = window.localStorage.getItem(storageKey(siteId));
    if (!stored) return EMPTY_BAG;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return EMPTY_BAG;

    return parsed.filter((item): item is StorefrontBagItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<StorefrontBagItem>;
      return (
        typeof candidate.offerId === "string" &&
        typeof candidate.listingId === "string" &&
        typeof candidate.productSlug === "string" &&
        typeof candidate.websiteVariantId === "string" &&
        typeof candidate.sku === "string" &&
        typeof candidate.quantity === "number" &&
        Number.isFinite(candidate.quantity) &&
        candidate.quantity > 0
      );
    });
  } catch {
    return EMPTY_BAG;
  }
}

function getBagSnapshot(siteId: string): StorefrontBagItem[] {
  if (typeof window === "undefined") return EMPTY_BAG;
  const cached = bagCache.get(siteId);
  if (cached) return cached;
  const items = readStoredBag(siteId);
  bagCache.set(siteId, items);
  return items;
}

function writeBag(siteId: string, items: StorefrontBagItem[]) {
  const nextItems = items.filter((item) => item.quantity > 0);
  bagCache.set(siteId, nextItems);

  if (typeof window === "undefined") return;

  try {
    if (nextItems.length) {
      window.localStorage.setItem(storageKey(siteId), JSON.stringify(nextItems));
    } else {
      window.localStorage.removeItem(storageKey(siteId));
    }
  } catch {
    // The in-memory snapshot still keeps the bag usable for this page session.
  }

  window.dispatchEvent(
    new CustomEvent(BAG_CHANGED_EVENT, { detail: { siteId } }),
  );
}

function subscribeToBag(siteId: string, onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleBagChange = (event: Event) => {
    const detail = (event as CustomEvent<{ siteId?: string }>).detail;
    if (detail?.siteId === siteId) onStoreChange();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey(siteId)) return;
    bagCache.delete(siteId);
    onStoreChange();
  };

  window.addEventListener(BAG_CHANGED_EVENT, handleBagChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(BAG_CHANGED_EVENT, handleBagChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useBagItems(siteId: string) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToBag(siteId, onStoreChange),
    [siteId],
  );
  const getSnapshot = useCallback(() => getBagSnapshot(siteId), [siteId]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_BAG);
}

export function addBagItem(
  siteId: string,
  item: Omit<StorefrontBagItem, "quantity">,
  quantity = 1,
) {
  const items = getBagSnapshot(siteId);
  const existing = items.find((candidate) => candidate.offerId === item.offerId);
  const safeQuantity = Math.max(1, Math.floor(quantity));

  if (existing) {
    writeBag(
      siteId,
      items.map((candidate) =>
        candidate.offerId === item.offerId
          ? { ...item, quantity: candidate.quantity + safeQuantity }
          : candidate,
      ),
    );
    return;
  }

  writeBag(siteId, [...items, { ...item, quantity: safeQuantity }]);
}

export function updateBagItemQuantity(
  siteId: string,
  offerId: string,
  quantity: number,
) {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  writeBag(
    siteId,
    getBagSnapshot(siteId).map((item) =>
      item.offerId === offerId ? { ...item, quantity: safeQuantity } : item,
    ),
  );
}

export function removeBagItem(siteId: string, offerId: string) {
  writeBag(
    siteId,
    getBagSnapshot(siteId).filter((item) => item.offerId !== offerId),
  );
}

export function clearBag(siteId: string) {
  writeBag(siteId, EMPTY_BAG);
}

export function bagItemCount(items: StorefrontBagItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}
