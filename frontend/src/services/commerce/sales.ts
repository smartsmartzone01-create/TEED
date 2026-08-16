import {
  saleAvailabilityResponseSchema,
  saleResponseSchema,
  salesResponseSchema,
} from "@/schemas/commerce/sales";
import { commerceBase } from "@/services/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

function getSales(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/sales/`,
    schema: salesResponseSchema,
    signal,
  });
}

function getSalesAvailability(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/sales/availability/`,
    schema: saleAvailabilityResponseSchema,
    signal,
  });
}

function createSale(businessId: string, accessToken: string, body: unknown) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/sales/`,
      schema: saleResponseSchema,
    }),
  );
}

function updateSale(
  businessId: string,
  saleId: string,
  accessToken: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${commerceBase(businessId)}/sales/${saleId}/`,
      schema: saleResponseSchema,
    }),
  );
}

function voidSale(
  businessId: string,
  saleId: string,
  accessToken: string,
  reason: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { reason },
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/sales/${saleId}/void/`,
      schema: saleResponseSchema,
    }),
  );
}

export { createSale, getSales, getSalesAvailability, updateSale, voidSale };
