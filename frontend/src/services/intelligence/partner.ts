import { kuzaAIPartnerResponseSchema } from "@/schemas/intelligence/partner";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";
import type { KuzaAIMessageRole } from "@/types/intelligence/kuza-ai";

type KuzaAILocale = "en" | "sw";
type KuzaAIHistoryMessage = {
  role: KuzaAIMessageRole;
  content: string;
};

function askKuzaAI(
  businessId: string,
  accessToken: string,
  message: string,
  locale: KuzaAILocale,
  history: KuzaAIHistoryMessage[] = [],
  signal?: AbortSignal,
) {
  return withCsrfRetry((csrfToken) =>
    requestApi({
      accessToken,
      body: { message, locale, history: history.slice(-12) },
      csrfToken,
      method: "POST",
      path: `/api/v1/intelligence/businesses/${businessId}/partner/`,
      schema: kuzaAIPartnerResponseSchema,
      signal,
    }),
  );
}

export { askKuzaAI };
export type { KuzaAIHistoryMessage, KuzaAILocale };
