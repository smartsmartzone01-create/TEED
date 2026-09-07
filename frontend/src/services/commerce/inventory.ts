import { genericResponseSchema } from "@/schemas/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import { commerceBase } from "@/services/commerce/shared";

const STOCK_RECEIPTS_CHANGED_EVENT = "tunakuza:stock-receipts-changed";

function announceStockReceiptsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STOCK_RECEIPTS_CHANGED_EVENT));
  }
}

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

async function createStockReceipt(
  businessId: string,
  accessToken: string,
  body: unknown,
) {
  const response = await withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/stock-receipts/`,
      schema: genericResponseSchema,
    }),
  );
  announceStockReceiptsChanged();
  return response;
}

async function correctStockReceipt(
  businessId: string,
  receiptId: string,
  accessToken: string,
  body: unknown,
) {
  const response = await withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "PATCH",
      path: `${commerceBase(businessId)}/stock-receipts/${receiptId}/`,
      schema: genericResponseSchema,
    }),
  );
  announceStockReceiptsChanged();
  return response;
}

async function archiveDraftStockReceipt(
  businessId: string,
  receiptId: string,
  accessToken: string,
) {
  const response = await withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/stock-receipts/${receiptId}/archive/`,
      schema: genericResponseSchema,
    }),
  );
  announceStockReceiptsChanged();
  return response;
}

export {
  STOCK_RECEIPTS_CHANGED_EVENT,
  archiveDraftStockReceipt,
  correctStockReceipt,
  createStockReceipt,
  getStockReceipts,
};
