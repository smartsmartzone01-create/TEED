"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { StockReceiptCorrectionDropdown } from "@/components/commerce/stock-receipt-correction-dropdown";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useNotification } from "@/providers/global/notification-provider";
import { commerceRead, getProducts } from "@/services/commerce/commerce";
import type { Product } from "@/types/commerce/commerce";

type StockLine = {
  id: string;
  product?: string;
  product_name: string;
  product_sku: string;
  tracking_mode: string;
  quantity_received: string;
  quantity_remaining: string;
  received_unit: string;
  conversion_to_base: string;
};

type StockReceipt = {
  id: string;
  reference: string;
  status: string;
  correction_open?: boolean;
  correction_deadline?: string | null;
  lines: StockLine[];
};

type Target = {
  receipt: StockReceipt;
  element: HTMLElement;
};

function StockCorrectionsPanel({ businessId }: { businessId: string }) {
  const t = useTranslations("Commerce");
  const { accessToken } = useIdentitySession();
  const { notify } = useNotification();
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [stockResponse, productsResponse] = await Promise.all([
        commerceRead(businessId, accessToken, "stock-receipts"),
        getProducts(businessId, accessToken),
      ]);
      const stock = stockResponse.data as { receipts?: StockReceipt[] } | null;
      setReceipts(stock?.receipts ?? []);
      setProducts(productsResponse.data?.products ?? []);
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.load"),
        tone: "error",
      });
    }
  }, [accessToken, businessId, notify, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const heading = Array.from(document.querySelectorAll("h2")).find(
          (node) => node.textContent?.trim() === t("receivedStock"),
        );
        const receivedPanel = heading?.parentElement;

        const nextTargets: Target[] = [];
        if (receivedPanel) {
          for (const receipt of receipts) {
            const article = Array.from(
              receivedPanel.querySelectorAll<HTMLElement>("article"),
            ).find(
              (node) =>
                node.querySelector("strong")?.textContent?.trim() ===
                receipt.reference,
            );
            if (!article) continue;

            let mount = article.querySelector<HTMLElement>(
              `[data-commerce-correction-root="${receipt.id}"]`,
            );
            if (!mount) {
              mount = document.createElement("div");
              mount.dataset.commerceCorrectionRoot = receipt.id;

              const editButton = Array.from(
                article.querySelectorAll<HTMLButtonElement>("button"),
              ).find(
                (button) =>
                  button.textContent?.trim() === t("actions.editStock"),
              );
              const actionRow = editButton?.parentElement;
              if (actionRow) actionRow.insertAdjacentElement("afterend", mount);
              else article.appendChild(mount);
            }
            nextTargets.push({ receipt, element: mount });
          }
        }

        setTargets((current) => {
          const unchanged =
            current.length === nextTargets.length &&
            current.every(
              (item, index) =>
                item.receipt.id === nextTargets[index]?.receipt.id &&
                item.element === nextTargets[index]?.element,
            );
          return unchanged ? current : nextTargets;
        });
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      for (const mount of document.querySelectorAll(
        "[data-commerce-correction-root]",
      )) {
        mount.remove();
      }
    };
  }, [receipts, t]);

  const submit = async (
    operation: () => Promise<unknown>,
    message: string,
  ): Promise<unknown | null> => {
    try {
      const result = await operation();
      notify({ message, tone: "success" });
      await load();
      window.location.reload();
      return result ?? true;
    } catch (reason) {
      notify({
        message: reason instanceof Error ? reason.message : t("errors.save"),
        tone: "error",
      });
      return null;
    }
  };

  return (
    <>
      {targets.map(({ receipt, element }) =>
        createPortal(
          <StockReceiptCorrectionDropdown
            accessToken={accessToken}
            businessId={businessId}
            products={products}
            receipt={receipt}
            submit={submit}
          />,
          element,
          receipt.id,
        ),
      )}
    </>
  );
}

export { StockCorrectionsPanel };
