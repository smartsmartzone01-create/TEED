import { genericResponseSchema } from "@/schemas/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

const commerceBase = (businessId: string) =>
  `/api/v1/commerce/businesses/${businessId}`;

function commerceWrite(
  businessId: string,
  accessToken: string,
  section: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/${section}/`,
      schema: genericResponseSchema,
    }),
  );
}

function commercePatch(
  businessId: string,
  accessToken: string,
  section: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${commerceBase(businessId)}/${section}/`,
      schema: genericResponseSchema,
    }),
  );
}

function commerceRead(
  businessId: string,
  accessToken: string,
  section: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/${section}/`,
    schema: genericResponseSchema,
    signal,
  });
}

export { commerceBase, commercePatch, commerceRead, commerceWrite };
