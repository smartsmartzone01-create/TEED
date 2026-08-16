import { genericResponseSchema } from "@/schemas/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import { commerceBase } from "@/services/commerce/shared";

function getStockReceipts(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/stock-receipts/`,
    schema: genericResponseSchema,
    signal,
  });
}

function createStockReceipt(
  businessId: string,
  accessToken: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/stock-receipts/`,
      schema: genericResponseSchema,
    }),
  );
}

function correctStockReceipt(
  businessId: string,
  receiptId: string,
  accessToken: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${commerceBase(businessId)}/stock-receipts/${receiptId}/`,
      schema: genericResponseSchema,
    }),
  );
}

function archiveDraftStockReceipt(
  businessId: string,
  receiptId: string,
  accessToken: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/stock-receipts/${receiptId}/archive/`,
      schema: genericResponseSchema,
    }),
  );
}

export {
  archiveDraftStockReceipt,
  correctStockReceipt,
  createStockReceipt,
  getStockReceipts,
};
