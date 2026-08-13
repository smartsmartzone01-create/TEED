"use client";

import {
  Check,
  MailPlus,
  ShieldCheck,
  UserMinus,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/global/primitives/button";
import { Input } from "@/components/global/primitives/input";
import { Tooltip } from "@/components/global/primitives/tooltip";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { isRequestCancelled } from "@/services/global/api-client";
import type {
  AssignableWorkspaceRole,
  WorkspaceAccessRequest,
  WorkspaceInvitation,
  WorkspaceMembership,
  WorkspaceRole,
} from "@/types/workspace/workspace";

type View = "access" | "invitations" | "members" | "roles";
const roles: WorkspaceRole[] = [
  "owner",
  "partner",
  "administrator",
  "manager",
  "member",
];
const rolePermissions: Record<WorkspaceRole, string[]> = {
  owner: [
    "access",
    "business",
    "members",
    "invitations",
    "control",
    "ownership",
  ],
  partner: ["access", "business", "members", "invitations", "control"],
  administrator: ["access", "business", "members", "invitations"],
  manager: ["access", "invitations"],
  member: ["access"],
};

function WorkspaceAccessManagement({
  businessId,
  view,
}: {
  businessId: string;
  view: View;
}) {
  const t = useTranslations("WorkspaceAccessManagement");
  const { notify } = useNotification();
  const workspace = useWorkspace();
  const business = workspace.businesses.find((item) => item.id === businessId);
  const membership = business?.membership;
  const supportsCollaboration =
    business?.capabilities.includes("team_collaboration") ?? false;
  const canManageMembers =
    membership?.permissions.includes("members.manage") ?? false;
  const canManageInvitations =
    membership?.permissions.includes("invitations.manage") ?? false;
  const [members, setMembers] = useState<WorkspaceMembership[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [requests, setRequests] = useState<WorkspaceAccessRequest[]>([]);
  const [loading, setLoading] = useState(view !== "roles");
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [approvalRoles, setApprovalRoles] = useState<
    Record<string, AssignableWorkspaceRole>
  >({});

  const allowedInviteRoles = useMemo<AssignableWorkspaceRole[]>(() => {
    if (membership?.role === "owner" || membership?.role === "partner")
      return ["partner", "administrator", "manager", "member"];
    if (membership?.role === "administrator") return ["manager", "member"];
    return ["member"];
  }, [membership?.role]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (view === "roles") return;
      if (business && !supportsCollaboration) {
        setLoading(false);
        return;
      }
      if (view === "invitations" && !canManageInvitations) {
        setLoading(false);
        return;
      }
      if (view === "access" && !canManageMembers) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (view === "members")
          setMembers(await workspace.loadMembers(businessId, signal));
        if (view === "invitations")
          setInvitations(await workspace.loadInvitations(businessId, signal));
        if (view === "access")
          setRequests(await workspace.loadAccessRequests(businessId, signal));
      } catch (error) {
        if (!isRequestCancelled(error))
          notify({ message: t("loadError"), tone: "error" });
      } finally {
        setLoading(false);
      }
    },
    [
      business,
      businessId,
      canManageInvitations,
      canManageMembers,
      notify,
      supportsCollaboration,
      t,
      view,
      workspace,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(initial);
      controller.abort();
    };
  }, [load]);

  async function updateMember(
    member: WorkspaceMembership,
    values: { role?: string; status?: string },
  ) {
    setBusy(member.id);
    try {
      const updated = await workspace.updateMember(
        businessId,
        member.id,
        values,
      );
      setMembers((current) =>
        values.status === "removed"
          ? current.filter((item) => item.id !== updated.id)
          : current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify({ message: t("members.updated"), tone: "success" });
    } catch {
      notify({ message: t("actionError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function sendInvitation(event: React.FormEvent) {
    event.preventDefault();
    setBusy("invite");
    try {
      const invitation = await workspace.inviteMember(businessId, {
        email,
        role: inviteRole,
      });
      setInvitations((current) => [invitation, ...current]);
      setEmail("");
      notify({ message: t("invitations.sent"), tone: "success" });
    } catch {
      notify({ message: t("actionError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function cancelInvitation(invitation: WorkspaceInvitation) {
    setBusy(invitation.id);
    try {
      const updated = await workspace.cancelInvitation(
        businessId,
        invitation.id,
      );
      setInvitations((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify({ message: t("invitations.cancelled"), tone: "success" });
    } catch {
      notify({ message: t("actionError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function decideRequest(
    requestId: string,
    decision: "approve" | "reject",
    role: AssignableWorkspaceRole = "member",
  ) {
    setBusy(requestId);
    try {
      await workspace.decideAccessRequest(businessId, requestId, {
        decision,
        role,
      });
      setRequests((current) => current.filter((item) => item.id !== requestId));
      notify({
        message: t(
          decision === "approve" ? "requests.approved" : "requests.rejected",
        ),
        tone: "success",
      });
    } catch {
      notify({ message: t("actionError"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  const header = (
    <header>
      <p className="text-sm font-medium text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        {t(`${view}.title`)}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        {t(`${view}.description`)}
      </p>
    </header>
  );
  const panel =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_3px_10px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950";

  if (business && !supportsCollaboration && view !== "roles") {
    return (
      <div className="space-y-6">
        {header}
        <section className={panel}>
          <ShieldCheck className="size-5 text-slate-500" />
          <p className="mt-3 text-sm font-medium">
            {t("collaborationUnavailable")}
          </p>
        </section>
      </div>
    );
  }

  if (view === "roles")
    return (
      <div className="space-y-6">
        {header}
        <div className="grid gap-3 lg:grid-cols-2">
          {roles.map((role) => (
            <article className={panel} key={role}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-5 text-brand-orange" />
                <h2 className="font-semibold">{t(`roleNames.${role}`)}</h2>
                {membership?.role === role ? (
                  <span className="ml-auto rounded-full bg-brand-orange/10 px-2 py-1 text-xs font-semibold text-brand-orange">
                    {t("roles.yours")}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {t(`roles.descriptions.${role}`)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {rolePermissions[role].map((permission) => (
                  <Tooltip
                    content={t(`permissions.${permission}.help`)}
                    key={permission}
                  >
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium dark:bg-slate-900">
                      {t(`permissions.${permission}.label`)}
                    </span>
                  </Tooltip>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    );

  const authorized =
    view === "members" ||
    (view === "invitations" ? canManageInvitations : canManageMembers);
  return (
    <div className="space-y-6">
      {header}
      {!authorized ? (
        <section className={panel}>
          <ShieldCheck className="size-5 text-slate-500" />
          <p className="mt-3 text-sm font-medium">{t("readOnly")}</p>
        </section>
      ) : null}
      {authorized && view === "invitations" ? (
        <form
          className={`${panel} grid gap-4 md:grid-cols-[1fr_14rem_auto] md:items-end`}
          onSubmit={sendInvitation}
        >
          <label className="grid gap-2 text-sm font-medium">
            {t("invitations.email")}
            <Input
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            {t("invitations.role")}
            <select
              className="h-11 rounded-xl border border-slate-200 bg-transparent px-3"
              onChange={(event) =>
                setInviteRole(event.target.value as AssignableWorkspaceRole)
              }
              value={inviteRole}
            >
              {allowedInviteRoles.map((role) => (
                <option key={role} value={role}>
                  {t(`roleNames.${role}`)}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={busy === "invite"} type="submit">
            <MailPlus className="size-4" />
            {t("invitations.send")}
          </Button>
        </form>
      ) : null}
      {authorized && loading ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : null}
      {authorized && !loading && view === "members" ? (
        <div className="space-y-3">
          {members.map((member) => {
            const protectedMember =
              member.role === "owner" ||
              (member.role === "partner" &&
                !["owner", "partner"].includes(membership?.role ?? ""));
            const roleOptions =
              membership?.role === "owner" || membership?.role === "partner"
                ? ["partner", "administrator", "manager", "member"]
                : ["manager", "member"];
            return (
              <article
                className={`${panel} flex flex-col gap-4 lg:flex-row lg:items-center`}
                key={member.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {member.username || member.email}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {member.email}
                  </p>
                </div>
                <span className="text-xs font-medium">
                  {t(`statuses.${member.status}`)}
                </span>
                {canManageMembers && !protectedMember ? (
                  <>
                    <select
                      className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm"
                      disabled={busy === member.id}
                      onChange={(event) =>
                        void updateMember(member, { role: event.target.value })
                      }
                      value={member.role}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {t(`roleNames.${role}`)}
                        </option>
                      ))}
                    </select>
                    <Button
                      disabled={busy === member.id}
                      onClick={() =>
                        void updateMember(member, {
                          status:
                            member.status === "suspended"
                              ? "active"
                              : "suspended",
                        })
                      }
                      size="small"
                      variant="outline"
                    >
                      {t(
                        member.status === "suspended"
                          ? "members.reactivate"
                          : "members.suspend",
                      )}
                    </Button>
                    <Tooltip content={t("members.removeHelp")}>
                      <Button
                        disabled={busy === member.id}
                        onClick={() =>
                          void updateMember(member, { status: "removed" })
                        }
                        size="small"
                        variant="outline"
                      >
                        <UserMinus className="size-4" />
                        {t("members.remove")}
                      </Button>
                    </Tooltip>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-900">
                    {t(`roleNames.${member.role}`)}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
      {authorized && !loading && view === "invitations" ? (
        <div className="space-y-3">
          {invitations.length ? (
            invitations.map((invitation) => (
              <article
                className={`${panel} flex items-center gap-4`}
                key={invitation.id}
              >
                <MailPlus className="size-5 text-brand-orange" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{invitation.email}</p>
                  <p className="text-xs text-slate-500">
                    {t(`roleNames.${invitation.role}`)} ·{" "}
                    {t(`statuses.${invitation.status}`)}
                  </p>
                </div>
                {invitation.status === "pending" ? (
                  <Button
                    disabled={busy === invitation.id}
                    onClick={() => void cancelInvitation(invitation)}
                    size="small"
                    variant="outline"
                  >
                    {t("invitations.cancel")}
                  </Button>
                ) : null}
              </article>
            ))
          ) : (
            <p className={panel}>{t("invitations.empty")}</p>
          )}
        </div>
      ) : null}
      {authorized && !loading && view === "access" ? (
        <div className="space-y-3">
          {requests.length ? (
            requests.map((request) => {
              const approvalRole =
                approvalRoles[request.id] ??
                allowedInviteRoles[allowedInviteRoles.length - 1] ??
                "member";
              return (
                <article className={panel} key={request.id}>
                  <div className="flex gap-3">
                    <UsersRound className="size-5 text-brand-orange" />
                    <div>
                      <p className="font-semibold">
                        {request.username || request.email}
                      </p>
                      <p className="text-xs text-slate-500">{request.email}</p>
                    </div>
                  </div>
                  {request.message ? (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
                      {request.message}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {t("requests.role")}
                      <select
                        className="h-9 rounded-xl border border-slate-200 bg-transparent px-3 text-sm dark:border-slate-800"
                        disabled={busy === request.id}
                        onChange={(event) =>
                          setApprovalRoles((current) => ({
                            ...current,
                            [request.id]: event.target
                              .value as AssignableWorkspaceRole,
                          }))
                        }
                        value={approvalRole}
                      >
                        {allowedInviteRoles.map((role) => (
                          <option key={role} value={role}>
                            {t(`roleNames.${role}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      disabled={busy === request.id}
                      onClick={() =>
                        void decideRequest(request.id, "approve", approvalRole)
                      }
                      size="small"
                    >
                      <Check className="size-4" />
                      {t("requests.approve")}
                    </Button>
                    <Button
                      disabled={busy === request.id}
                      onClick={() => void decideRequest(request.id, "reject")}
                      size="small"
                      variant="outline"
                    >
                      <X className="size-4" />
                      {t("requests.reject")}
                    </Button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className={panel}>{t("requests.empty")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export { WorkspaceAccessManagement };
