"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useNotification } from "@/providers/global/notification-provider";

function StockRecordingValidationGuard() {
  const t = useTranslations("Commerce");
  const { notify } = useNotification();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("button");
      if (!button || button.textContent?.trim() !== t("actions.enter")) return;
      const section = button.closest("section");
      if (!section || !section.textContent?.includes(t("identitiesTitle"))) return;

      const invalid = Array.from(
        section.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          "input[required], select[required]",
        ),
      ).find((field) => !field.checkValidity());
      if (!invalid) return;

      event.preventDefault();
      event.stopPropagation();
      const label =
        invalid.closest("label")?.childNodes[0]?.textContent?.trim() ||
        t("fields.product");
      const message = `${label}: ${t("errors.save")}`;
      notify({ message, tone: "error" });
      invalid.focus();
      invalid.reportValidity();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [notify, t]);

  return null;
}

export { StockRecordingValidationGuard };
