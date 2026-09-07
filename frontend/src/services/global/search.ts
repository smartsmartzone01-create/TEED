import { workspaceSearchResponseSchema } from "@/schemas/global/search";
import { requestApi } from "@/services/global/api-client";
import type { WorkspaceSearchScope } from "@/types/global/search";

function searchWorkspace(
  businessId: string,
  accessToken: string,
  query: string,
  scope: WorkspaceSearchScope = "all",
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    q: query,
    scope,
    limit: "8",
  });

  return requestApi({
    accessToken,
    path: `/api/v1/search/businesses/${businessId}/?${params.toString()}`,
    schema: workspaceSearchResponseSchema,
    signal,
  });
}

export { searchWorkspace };
