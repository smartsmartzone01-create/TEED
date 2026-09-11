import {
  websiteDeleteEnvelopeSchema,
  websiteMediaEnvelopeSchema,
  websiteMediaListEnvelopeSchema,
  websiteSiteEnvelopeSchema,
  websiteSiteListEnvelopeSchema,
} from "@/schemas/website/website";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

const WEBSITE_BASE_PATH = "/api/v1/website";

function getWebsiteSites(businessId: string, accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/`,
    schema: websiteSiteListEnvelopeSchema,
    signal,
  });
}

function createWebsiteSite(businessId: string, accessToken: string) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: {},
      csrfToken,
      method: "POST",
      path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/`,
      schema: websiteSiteEnvelopeSchema,
    }),
  );
}

function getWebsiteMedia(
  businessId: string,
  siteId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/`,
    schema: websiteMediaListEnvelopeSchema,
    signal,
  });
}

function uploadWebsiteMedia(
  businessId: string,
  siteId: string,
  file: File,
  altText: Record<string, string>,
  accessToken: string,
) {
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("alt_text", JSON.stringify(altText));
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/upload/`,
      schema: websiteMediaEnvelopeSchema,
    }),
  );
}

function deleteWebsiteMedia(
  businessId: string,
  siteId: string,
  mediaId: string,
  accessToken: string,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      csrfToken,
      method: "DELETE",
      path: `${WEBSITE_BASE_PATH}/businesses/${businessId}/sites/${siteId}/media/${mediaId}/`,
      schema: websiteDeleteEnvelopeSchema,
    }),
  );
}

export {
  createWebsiteSite,
  deleteWebsiteMedia,
  getWebsiteMedia,
  getWebsiteSites,
  uploadWebsiteMedia,
};
