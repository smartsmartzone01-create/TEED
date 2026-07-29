type ApiFieldIssue = {
  code: string;
  message: string;
};

interface ApiFieldErrors {
  [field: string]: ApiFieldIssue[] | ApiFieldErrors;
}

type ApiErrors = {
  code: string;
  fields?: ApiFieldErrors;
};

type ApiEnvelope<T> = {
  data?: T | null;
  errors?: ApiErrors | null;
  message: string;
  meta?: Record<string, unknown>;
  success: boolean;
};

type ApiErrorKind =
  | "cancelled"
  | "conflict"
  | "forbidden"
  | "network"
  | "server"
  | "throttled"
  | "unauthenticated"
  | "unexpected"
  | "validation";

type NormalizedApiError = {
  code: string;
  fieldErrors: ApiFieldErrors;
  kind: ApiErrorKind;
  message: string;
  status?: number;
};

export type {
  ApiEnvelope,
  ApiErrorKind,
  ApiErrors,
  ApiFieldErrors,
  ApiFieldIssue,
  NormalizedApiError,
};
