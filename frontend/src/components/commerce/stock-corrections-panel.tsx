"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { StockReceiptCorrectionDropdown } from "@/components/commerce/stock-receipt-correction-dropdown";
import { Button } from "@/components/global/primitives/button";
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
  const [viewMoreTarget, setViewMoreTarget] = useState<HTMLElement | null>(null);
  const [showAll, setShowAll] = useState(false);

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
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
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
        let nextViewMoreTarget: HTMLElement | null = null;
        if (receivedPanel) {
          for (const [index, receipt] of receipts.entries()) {
            const article = Array.from(
              receivedPanel.querySelectorAll<HTMLElement>("article"),
            ).find(
              (node) =>
                node.querySelector("strong")?.textContent?.trim() ===
                receipt.reference,
            );
            if (!article) continue;

            const hiddenByLimit = !showAll && index >= 5;
            article.hidden = hiddenByLimit;
            if (hiddenByLimit) article.dataset.commerceStockHidden = "true";
            else delete article.dataset.commerceStockHidden;

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

          if (receipts.length > 5) {
            let viewMoreMount = receivedPanel.querySelector<HTMLElement>(
              "[data-commerce-stock-view-more-root]",
            );
            if (!viewMoreMount) {
              viewMoreMount = document.createElement("div");
              viewMoreMount.dataset.commerceStockViewMoreRoot = "true";
              viewMoreMount.className = "mt-3";
              receivedPanel.appendChild(viewMoreMount);
            }
            nextViewMoreTarget = viewMoreMount;
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
        setViewMoreTarget((current) =>
          current === nextViewMoreTarget ? current : nextViewMoreTarget,
        );
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      for (const article of document.querySelectorAll<HTMLElement>(
        "[data-commerce-stock-hidden]",
      )) {
        article.hidden = false;
        delete article.dataset.commerceStockHidden;
      }
      for (const mount of document.querySelectorAll(
        "[data-commerce-correction-root], [data-commerce-stock-view-more-root]",
      )) {
        mount.remove();
      }
    };
  }, [receipts, showAll, t]);

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
      {viewMoreTarget
        ? createPortal(
            <Button
              onClick={() => setShowAll((current) => !current)}
              size="small"
              type="button"
              variant="ghost"
            >
              {showAll ? t("actions.showLess") : t("actions.viewMore")}
            </Button>,
            viewMoreTarget,
          )
        : null}
    </>
  );
}

export { StockCorrectionsPanel };
