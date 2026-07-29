"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import type {
  ApiFieldIssue,
  NormalizedApiError,
} from "@/types/global/api";

function useApiErrorMessages() {
  const errors = useTranslations("IdentityErrors");
  const fields = useTranslations("IdentityFieldErrors");

  const getErrorMessage = useCallback(
    (error: NormalizedApiError) => {
      if (errors.has(error.code)) {
        return errors(error.code);
      }

      return error.message || errors("unexpected_error");
    },
    [errors],
  );

  const getFieldMessage = useCallback(
    (issue?: ApiFieldIssue) => {
      if (!issue) {
        return undefined;
      }

      if (fields.has(issue.code)) {
        return fields(issue.code);
      }

      return issue.message;
    },
    [fields],
  );

  return {
    getErrorMessage,
    getFieldMessage,
  };
}

export { useApiErrorMessages };
