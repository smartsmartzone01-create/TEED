import { overviewResponseSchema } from "@/schemas/commerce/overview";
import { commerceBase } from "@/services/commerce/shared";
import { requestApi } from "@/services/global/api-client";

function getCommerceOverview(
  businessId: string,
  accessToken: string,
  signal?: AbortSignal,
) {
  return requestApi({
    accessToken,
    path: `${commerceBase(businessId)}/overview/`,
    schema: overviewResponseSchema,
    signal,
  });
}

export { getCommerceOverview };
