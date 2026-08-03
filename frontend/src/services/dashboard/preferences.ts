import { preferencesEnvelopeSchema } from "@/schemas/dashboard/preferences";
import { requestApi } from "@/services/global/api-client";
import type { UserPreferenceUpdate } from "@/types/dashboard/preferences";

const PREFERENCES_PATH = "/api/v1/profiles/me/preferences/";

function getPreferences(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: PREFERENCES_PATH,
    schema: preferencesEnvelopeSchema,
    signal,
  });
}

function updatePreferences(values: UserPreferenceUpdate, accessToken: string) {
  return requestApi({
    accessToken,
    body: values,
    method: "PATCH",
    path: PREFERENCES_PATH,
    schema: preferencesEnvelopeSchema,
  });
}

export { getPreferences, updatePreferences };
