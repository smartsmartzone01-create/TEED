import type {
  ApiEnvelope,
  ApiErrorKind,
  ApiFieldErrors,
  ApiFieldIssue,
  NormalizedApiError,
} from "@/types/global/api";

const FALLBACK_ERROR_CODE = "unexpected_error";
const FALLBACK_ERROR_MESSAGE =
  "Something went wrong. Please try again.";

function isFieldIssue(value: unknown): value is ApiFieldIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const issue = value as Record<string, unknown>;

  return (
    typeof issue.code === "string" &&
    typeof issue.message === "string"
  );
}

function normalizeFieldErrors(value: unknown): ApiFieldErrors {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const result: ApiFieldErrors = {};

  Object.entries(value).forEach(([field, issues]) => {
    if (Array.isArray(issues)) {
      result[field] = issues.filter(isFieldIssue);
      return;
    }

    const nested = normalizeFieldErrors(issues);

    if (Object.keys(nested).length > 0) {
      result[field] = nested;
    }
  });

  return result;
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) {
    return "validation";
  }

  if (status === 401) {
    return "unauthenticated";
  }

  if (status === 403) {
    return "forbidden";
  }

  if (status === 409) {
    return "conflict";
  }

  if (status === 429) {
    return "throttled";
  }

  if (status >= 500) {
    return "server";
  }

  return "unexpected";
}

function normalizeApiFailure(
  status: number,
  payload?: ApiEnvelope<unknown>,
): NormalizedApiError {
  return {
    code: payload?.errors?.code ?? FALLBACK_ERROR_CODE,
    fieldErrors: normalizeFieldErrors(
      payload?.errors?.fields,
    ),
    kind: kindFromStatus(status),
    message: payload?.message || FALLBACK_ERROR_MESSAGE,
    status,
  };
}

function createNetworkError(error: unknown): NormalizedApiError {
  if (
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return {
      code: "request_cancelled",
      fieldErrors: {},
      kind: "cancelled",
      message: "The request was cancelled.",
    };
  }

  return {
    code: "network_error",
    fieldErrors: {},
    kind: "network",
    message:
      "TEED could not connect to the server. Check your connection and try again.",
  };
}

function firstFieldIssue(
  fieldErrors: ApiFieldErrors,
  field: string,
): ApiFieldIssue | undefined {
  const value = fieldErrors[field];

  return Array.isArray(value) ? value[0] : undefined;
}

export {
  createNetworkError,
  firstFieldIssue,
  normalizeApiFailure,
};
