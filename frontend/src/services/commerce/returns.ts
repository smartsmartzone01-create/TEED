import {
  returnResponseSchema,
  returnsWorkspaceResponseSchema,
} from "@/schemas/commerce/returns";
import { commerceBase } from "@/services/commerce/shared";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type { ReturnCreateInput } from "@/types/commerce/returns";

type ReturnLookupPeriod = {
  soldFrom?: string;
  soldBefore?: string;
};

function getReturnsWorkspace(
  businessId: string,
  accessToken: string,
  period: ReturnLookupPeriod = {},
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (period.soldFrom) query.set("sold_from", period.soldFrom);
  if (period.soldBefore) query.set("sold_before", period.soldBefore);
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";

  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/returns/${suffix}`,
    schema: returnsWorkspaceResponseSchema,
    signal,
  });
}

function createReturn(
  businessId: string,
  accessToken: string,
  body: ReturnCreateInput,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body,
      csrfToken,
      method: "POST",
      path: `${commerceBase(businessId)}/returns/`,
      schema: returnResponseSchema,
    }),
  );
}

export { createReturn, getReturnsWorkspace };
export type { ReturnLookupPeriod };
