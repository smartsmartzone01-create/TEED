"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";

type CostMode = "per_unit" | "total";
type Target = {
  input: HTMLInputElement;
  quantityInput: HTMLInputElement;
  mount: HTMLElement;
};

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function BuyingPriceControl({ target }: { target: Target }) {
  const stockT = useTranslations("CommerceStock");
  const [mode, setMode] = useState<CostMode>("per_unit");
  const [displayValue, setDisplayValue] = useState(target.input.value);

  const normalize = useCallback(
    (value: string, selectedMode: CostMode) => {
      if (!value) {
        setReactInputValue(target.input, "");
        return;
      }
      const entered = Number(value);
      const quantity = Number(target.quantityInput.value);
      if (!Number.isFinite(entered) || entered < 0) return;
      if (selectedMode === "total") {
        if (!Number.isFinite(quantity) || quantity <= 0) return;
        setReactInputValue(target.input, String(entered / quantity));
        return;
      }
      setReactInputValue(target.input, value);
    },
    [target.input, target.quantityInput],
  );

  useEffect(() => {
    const onQuantityChange = () => {
      if (mode === "total") normalize(displayValue, "total");
    };
    target.quantityInput.addEventListener("input", onQuantityChange);
    return () => target.quantityInput.removeEventListener("input", onQuantityChange);
  }, [displayValue, mode, normalize, target.quantityInput]);

  const changeMode = (nextMode: CostMode) => {
    const quantity = Number(target.quantityInput.value);
    const normalizedUnitCost = Number(target.input.value || "0");
    const nextDisplay =
      nextMode === "total" && Number.isFinite(quantity) && quantity > 0
        ? String(normalizedUnitCost * quantity)
        : target.input.value;
    setMode(nextMode);
    setDisplayValue(nextDisplay);
    normalize(nextDisplay, nextMode);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[8.5rem_1fr]">
      <Select
        aria-label={stockT("costMode.label")}
        onChange={(event) => changeMode(event.target.value as CostMode)}
        value={mode}
      >
        <option value="per_unit">{stockT("costMode.perUnit")}</option>
        <option value="total">{stockT("costMode.total")}</option>
      </Select>
      <Input
        min="0"
        onChange={(event) => {
          setDisplayValue(event.target.value);
          normalize(event.target.value, mode);
        }}
        step="0.01"
        type="number"
        value={displayValue}
      />
    </div>
  );
}

function StockBuyingPriceModePanel() {
  const t = useTranslations("Commerce");
  const [targets, setTargets] = useState<Target[]>([]);

  useEffect(() => {
    let frame = 0;
    const scan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next: Target[] = [];
        for (const label of Array.from(document.querySelectorAll("label"))) {
          if (!label.textContent?.includes(t("fields.buyingPrice"))) continue;
          const input = label.querySelector<HTMLInputElement>("input[type='number']");
          if (!input || input.dataset.commerceCostModeSource === "true") continue;
          const card = input.closest<HTMLElement>(".rounded-xl.bg-slate-50");
          if (!card) continue;
          const quantityLabel = Array.from(card.querySelectorAll("label")).find(
            (candidate) => candidate.textContent?.includes(t("fields.quantity")),
          );
          const quantityInput = quantityLabel?.querySelector<HTMLInputElement>(
            "input[type='number']",
          );
          if (!quantityInput) continue;

          input.dataset.commerceCostModeSource = "true";
          input.classList.add("hidden");
          const mount = document.createElement("div");
          mount.dataset.commerceCostModeRoot = "true";
          input.insertAdjacentElement("afterend", mount);
          next.push({ input, quantityInput, mount });
        }
        if (next.length) setTargets((current) => [...current, ...next]);
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      for (const input of document.querySelectorAll<HTMLInputElement>(
        "[data-commerce-cost-mode-source]",
      )) {
        input.classList.remove("hidden");
        delete input.dataset.commerceCostModeSource;
      }
      for (const mount of document.querySelectorAll(
        "[data-commerce-cost-mode-root]",
      )) {
        mount.remove();
      }
    };
  }, [t]);

  return (
    <>
      {targets.map((target, index) =>
        target.mount.isConnected
          ? createPortal(<BuyingPriceControl target={target} />, target.mount, index)
          : null,
      )}
    </>
  );
}

export { StockBuyingPriceModePanel };
