"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import type {
  ApiFieldIssue,
  NormalizedApiError,
} from "@/types/global/api";
import { frontendBrandText } from "@/utils/global/product-brand";

function useApiErrorMessages() {
  const errors = useTranslations("IdentityErrors");
  const fields = useTranslations("IdentityFieldErrors");

  const getErrorMessage = useCallback(
    (error: NormalizedApiError) => {
      if (errors.has(error.code)) {
        return frontendBrandText(errors(error.code));
      }

      return frontendBrandText(error.message || errors("unexpected_error"));
    },
    [errors],
  );

  const getFieldMessage = useCallback(
    (issue?: ApiFieldIssue) => {
      if (!issue) return undefined;
      if (fields.has(issue.code)) return frontendBrandText(fields(issue.code));
      return frontendBrandText(issue.message);
    },
    [fields],
  );

  return { getErrorMessage, getFieldMessage };
}

export { useApiErrorMessages };
