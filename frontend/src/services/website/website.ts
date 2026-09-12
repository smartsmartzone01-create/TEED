import {
  websiteCommerceCatalogEnvelopeSchema,
  websiteCommerceImportEnvelopeSchema,
  websiteDeleteEnvelopeSchema,
  websiteListingEnvelopeSchema,
  websiteListingListEnvelopeSchema,
  websiteMediaEnvelopeSchema,
  websiteMediaListEnvelopeSchema,
  websiteSiteEnvelopeSchema,
  websiteSiteListEnvelopeSchema,
  websiteVariantEnvelopeSchema,
  websiteVariantListEnvelopeSchema,
} from "@/schemas/website/website";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type {
  WebsiteListingInput,
  WebsiteVariantInput,
} from "@/types/website/website";

const WEBSITE_BASE_PATH = "/api/v1/website";

function getWebsiteSites(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/`, schema: websiteSiteListEnvelopeSchema, signal });
}

function createWebsiteSite(businessId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: {}, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/`, schema: websiteSiteEnvelopeSchema }));
}

function updateWebsiteSite(businessId: string, siteId: string, values: { header?: unknown; hero?: unknown; navigation?: unknown }, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: values, csrfToken, method: "PATCH", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/`, schema: websiteSiteEnvelopeSchema }));
}

function getWebsiteMedia(businessId: string, siteId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/`, schema: websiteMediaListEnvelopeSchema, signal });
}

function uploadWebsiteMedia(businessId: string, siteId: string, file: File, altText: Record<string, string>, accessToken: string) {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("alt_text", JSON.stringify(altText));
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/upload/`, schema: websiteMediaEnvelopeSchema }));
}

function deleteWebsiteMedia(businessId: string, siteId: string, mediaId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, csrfToken, method: "DELETE", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/${mediaId}/`, schema: websiteDeleteEnvelopeSchema }));
}

function getWebsiteListings(businessId: string, siteId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/`, schema: websiteListingListEnvelopeSchema, signal });
}

function createWebsiteListing(businessId: string, siteId: string, values: WebsiteListingInput, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: values, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/`, schema: websiteListingEnvelopeSchema }));
}

function updateWebsiteListing(businessId: string, siteId: string, listingId: string, values: Partial<WebsiteListingInput>, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: values, csrfToken, method: "PATCH", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/`, schema: websiteListingEnvelopeSchema }));
}

function deleteWebsiteListing(businessId: string, siteId: string, listingId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, csrfToken, method: "DELETE", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/`, schema: websiteDeleteEnvelopeSchema }));
}

function getWebsiteVariants(businessId: string, siteId: string, listingId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/variants/`, schema: websiteVariantListEnvelopeSchema, signal });
}

function createWebsiteVariant(businessId: string, siteId: string, listingId: string, values: WebsiteVariantInput, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: values, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/variants/`, schema: websiteVariantEnvelopeSchema }));
}

function updateWebsiteVariant(businessId: string, siteId: string, listingId: string, variantId: string, values: Partial<WebsiteVariantInput>, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: values, csrfToken, method: "PATCH", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/variants/${variantId}/`, schema: websiteVariantEnvelopeSchema }));
}

function deleteWebsiteVariant(businessId: string, siteId: string, listingId: string, variantId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, csrfToken, method: "DELETE", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/variants/${variantId}/`, schema: websiteDeleteEnvelopeSchema }));
}

function getWebsiteCommerceCatalog(businessId: string, siteId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({ accessToken, path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/commerce/catalog/`, schema: websiteCommerceCatalogEnvelopeSchema, signal });
}

function importWebsiteCommerceProducts(businessId: string, siteId: string, productIds: string[], accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: { product_ids: productIds }, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/commerce/import/`, schema: websiteCommerceImportEnvelopeSchema }));
}

function disconnectWebsiteCommerceVariant(businessId: string, siteId: string, listingId: string, variantId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) => requestApi({ accessToken, body: {}, csrfToken, method: "POST", path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/listings/${listingId}/variants/${variantId}/commerce/disconnect/`, schema: websiteVariantEnvelopeSchema }));
}

export {
  createWebsiteListing,
  createWebsiteSite,
  createWebsiteVariant,
  deleteWebsiteListing,
  deleteWebsiteMedia,
  deleteWebsiteVariant,
  disconnectWebsiteCommerceVariant,
  getWebsiteCommerceCatalog,
  getWebsiteListings,
  getWebsiteMedia,
  getWebsiteSites,
  getWebsiteVariants,
  importWebsiteCommerceProducts,
  updateWebsiteListing,
  updateWebsiteSite,
  updateWebsiteVariant,
  uploadWebsiteMedia,
};
