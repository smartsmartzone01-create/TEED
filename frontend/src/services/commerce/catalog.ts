import {
  productResponseSchema,
  productsResponseSchema,
} from "@/schemas/commerce/catalog";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import { commerceBase } from "@/services/commerce/shared";

function getProducts(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/products/`,
    schema: productsResponseSchema,
    signal,
  });
}

function createProduct(
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
      path: `${commerceBase(businessId)}/products/`,
      schema: productResponseSchema,
    }),
  );
}

export { createProduct, getProducts };
