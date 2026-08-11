import { actionSchema, activitySchema, overviewSchema, sessionsSchema } from "@/schemas/security/security";
import { requestApi } from "@/services/global/api-client";
import { withCsrfRetry } from "@/services/identity/csrf";

const getOverview = (accessToken: string) => requestApi({ accessToken, path: "/api/v1/security/me/overview/", schema: overviewSchema });
const getSessions = (accessToken: string) => requestApi({ accessToken, path: "/api/v1/security/me/sessions/", schema: sessionsSchema });
const getActivity = (accessToken: string) => requestApi({ accessToken, path: "/api/v1/security/me/activity/", schema: activitySchema });
const changePassword = (accessToken: string, body: { current_password: string; new_password: string; confirm_password: string }) => withCsrfRetry((csrfToken) => requestApi({ accessToken, body, csrfToken, method: "POST", path: "/api/v1/security/me/password/", schema: actionSchema }));
const revokeSession = (accessToken: string, id: string) => withCsrfRetry((csrfToken) => requestApi({ accessToken, csrfToken, method: "DELETE", path: `/api/v1/security/me/sessions/${id}/`, schema: actionSchema }));
const revokeOtherSessions = (accessToken: string) => withCsrfRetry((csrfToken) => requestApi({ accessToken, body: {}, csrfToken, method: "POST", path: "/api/v1/security/me/sessions/revoke-others/", schema: actionSchema }));
export { changePassword, getActivity, getOverview, getSessions, revokeOtherSessions, revokeSession };
