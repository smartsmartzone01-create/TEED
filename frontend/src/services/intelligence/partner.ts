import { kuzaAIPartnerResponseSchema } from "@/schemas/intelligence/partner";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

type KuzaAILocale = "en" | "sw";

function askKuzaAI(
  businessId: string,
  accessToken: string,
  message: string,
  locale: KuzaAILocale,
  signal?: AbortSignal,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { message, locale },
      csrfToken,
      method: "POST",
      path: `/api/v1/intelligence/businesses/${businessId}/partner/`,
      schema: kuzaAIPartnerResponseSchema,
      signal,
    }),
  );
}

export { askKuzaAI };
export type { KuzaAILocale };
