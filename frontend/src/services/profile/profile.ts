import { requestApi } from "@/services/global/api-client";
import {
  contactInformationEnvelopeSchema,
  emptyProfileEnvelopeSchema,
  personalInformationEnvelopeSchema,
  profileOverviewEnvelopeSchema,
} from "@/schemas/profile/profile";
import type { ProfileUpdateValues } from "@/types/profile/profile";

const PROFILE_BASE_PATH = "/api/v1/profiles/me";

function getProfileOverview(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${PROFILE_BASE_PATH}/overview/`,
    schema: profileOverviewEnvelopeSchema,
    signal,
  });
}

function getPersonalInformation(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${PROFILE_BASE_PATH}/personal-information/`,
    schema: personalInformationEnvelopeSchema,
    signal,
  });
}

function getContactInformation(accessToken: string, signal?: AbortSignal) {
  return requestApi({
    accessToken,
    path: `${PROFILE_BASE_PATH}/contacts/`,
    schema: contactInformationEnvelopeSchema,
    signal,
  });
}

function updateProfile(values: ProfileUpdateValues, accessToken: string) {
  const body = new FormData();
  body.set("first_name", values.firstName);
  body.set("last_name", values.lastName);
  body.set("username", values.username);
  body.set("country_code", values.countryCode);
  body.set("region", values.region);

  const image = values.profileImage?.item(0);
  if (image) {
    body.set("profile_image", image);
  }

  return requestApi({
    accessToken,
    body,
    method: "PATCH",
    path: `${PROFILE_BASE_PATH}/`,
    schema: personalInformationEnvelopeSchema,
  });
}

function removeProfileImage(accessToken: string) {
  return requestApi({
    accessToken,
    method: "DELETE",
    path: `${PROFILE_BASE_PATH}/image/`,
    schema: emptyProfileEnvelopeSchema,
  });
}

export {
  getContactInformation,
  getPersonalInformation,
  getProfileOverview,
  removeProfileImage,
  updateProfile,
};
