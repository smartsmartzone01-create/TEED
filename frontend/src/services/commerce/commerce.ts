import { genericResponseSchema, overviewResponseSchema, productResponseSchema, productsResponseSchema, saleResponseSchema, salesResponseSchema } from "@/schemas/commerce/commerce";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

const base = (businessId: string) => `/api/v1/commerce/businesses/${businessId}`;
function getCommerceOverview(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${base(businessId)}/overview/`, schema: overviewResponseSchema, signal });
}
function getProducts(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${base(businessId)}/products/`, schema: productsResponseSchema, signal });
}
function createProduct(businessId: string, accessToken: string, body: unknown) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "POST", path: `${base(businessId)}/products/`, schema: productResponseSchema }));
}
function getSales(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${base(businessId)}/sales/`, schema: salesResponseSchema, signal });
}
function createSale(businessId: string, accessToken: string, body: unknown) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "POST", path: `${base(businessId)}/sales/`, schema: saleResponseSchema }));
}
function updateSale(businessId: string, saleId: string, accessToken: string, body: unknown) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "PATCH", path: `${base(businessId)}/sales/${saleId}/`, schema: saleResponseSchema }));
}
function voidSale(businessId: string, saleId: string, accessToken: string, reason: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: { reason }, csrfToken, method: "POST", path: `${base(businessId)}/sales/${saleId}/void/`, schema: saleResponseSchema }));
}
function commerceWrite(businessId: string, accessToken: string, section: string, body: unknown) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "POST", path: `${base(businessId)}/${section}/`, schema: genericResponseSchema }));
}
function commercePatch(businessId: string, accessToken: string, section: string, body: unknown) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "PATCH", path: `${base(businessId)}/${section}/`, schema: genericResponseSchema }));
}
function commerceRead(businessId: string, accessToken: string, section: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${base(businessId)}/${section}/`, schema: genericResponseSchema, signal });
}

export { commercePatch, commerceRead, commerceWrite, createProduct, createSale, getCommerceOverview, getProducts, getSales, updateSale, voidSale };
