import { firstFieldIssue } from "@/lib/global/api-errors";
import {
  financingAgreementResponseSchema,
  financingAgreementsResponseSchema,
  financingAvailabilityResponseSchema,
  financingDocumentResponseSchema,
  financingPaymentResponseSchema,
} from "@/schemas/commerce/financing";
import { commerceBase } from "@/services/commerce/shared";
import { ApiClientError, requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

function getFinancingAgreements(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/financing/`,
    schema: financingAgreementsResponseSchema,
    signal,
  });
}

function getFinancingAvailability(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/financing/availability/`,
    schema: financingAvailabilityResponseSchema,
    signal,
  });
}

function createFinancingAgreement(
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
      path: `${commerceBase(businessId)}/financing/`,
      schema: financingAgreementResponseSchema,
    }),
  );
}

function createFinancingPayment(
  businessId: string,
  agreementId: string,
  accessToken: string,
  body: unknown,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/financing/${agreementId}/payments/`,
      schema: financingPaymentResponseSchema,
    }),
  );
}

function normalizedFinancingDocument(file: File) {
  if (file.type && file.type !== "image/jpg" && file.type !== "application/octet-stream") {
    return file;
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "heic"
              ? "image/heic"
              : extension === "heif"
                ? "image/heif"
                : file.type;
  return contentType && contentType !== file.type
    ? new File([file], file.name, {
        lastModified: file.lastModified,
        type: contentType,
      })
    : file;
}

async function uploadFinancingDocument(
  businessId: string,
  agreementId: string,
  accessToken: string,
  file: File,
  description = "",
) {
  const body = new FormData();
  body.append("file", normalizedFinancingDocument(file));
  body.append("description", description);
  try {
    return await withCsrfRetry((csrfToken) =>
      requestApi({
        accessToken,
        body,
        csrfToken,
        method: "POST",
        path: `${commerceBase(businessId)}/financing/${agreementId}/documents/`,
        schema: financingDocumentResponseSchema,
      }),
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      const issue =
        firstFieldIssue(error.details.fieldErrors, "file") ??
        firstFieldIssue(error.details.fieldErrors, "description");
      if (issue) throw new Error(issue.message);
    }
    throw error;
  }
}

async function downloadFinancingDocument(
  downloadPath: string,
  accessToken: string,
  filename: string,
) {
  const developmentApiBaseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:8000" : "";
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? developmentApiBaseUrl;
  const response = await fetch(`${baseUrl}${downloadPath}`, {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Financing document could not be downloaded.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export {
  createFinancingAgreement,
  createFinancingPayment,
  downloadFinancingDocument,
  getFinancingAgreements,
  getFinancingAvailability,
  uploadFinancingDocument,
};
