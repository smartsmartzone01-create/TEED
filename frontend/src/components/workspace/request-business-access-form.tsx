"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, LoaderCircle, Search, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { createAccessRequestFormSchema } from "@/schemas/workspace/workspace";
import { ApiClientError } from "@/services/global/api-client";
import type {
  RequestBusinessAccessValues,
  WorkspaceBusinessDiscovery,
} from "@/types/workspace/workspace";

function RequestBusinessAccessForm() {
  const t = useTranslations("WorkspaceAccess");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const { notify } = useNotification();
  const { discoverBusinesses, requestAccess } = useWorkspace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceBusinessDiscovery[]>([]);
  const [selected, setSelected] = useState<WorkspaceBusinessDiscovery | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const schema = useMemo(
    () =>
      createAccessRequestFormSchema({
        businessId: t("validation.businessId"),
        message: t("validation.message"),
      }),
    [t],
  );
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<RequestBusinessAccessValues>({
    defaultValues: { businessId: "", message: "" },
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const normalized = query.trim().replace(/^@/, "");
    if (!normalized || selected) {
      setResults([]);
      setSearching(false);
      setSearchFailed(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchFailed(false);
      void discoverBusinesses(normalized, controller.signal)
        .then(setResults)
        .catch((error) => {
          if (!(error instanceof ApiClientError && error.details.code === "request_cancelled")) {
            setSearchFailed(true);
          }
        })
        .finally(() => setSearching(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [discoverBusinesses, query, selected]);

  function selectBusiness(business: WorkspaceBusinessDiscovery) {
    setSelected(business);
    setQuery(business.name);
    setResults([]);
    setValue("businessId", business.id, { shouldValidate: true });
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (selected) {
      setSelected(null);
      setValue("businessId", "", { shouldValidate: false });
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await requestAccess(values);
      notify({ message: t("success"), tone: "success" });
      router.push("/dashboard/workspaces");
    } catch (error) {
      if (error instanceof ApiClientError) {
        const businessIssue = firstFieldIssue(error.details.fieldErrors, "business_id");
        const messageIssue = firstFieldIssue(error.details.fieldErrors, "message");
        if (businessIssue) setError("businessId", { message: getFieldMessage(businessIssue) });
        if (messageIssue) setError("message", { message: getFieldMessage(messageIssue) });

        if (error.details.code === "business_membership_exists" && selected) {
          notify({ message: t("errors.business_membership_exists"), tone: "info" });
          router.push(`/workspace/${selected.id}`);
          return;
        }

        const focusedCodes = [
          "access_request_already_pending",
          "access_request_recently_rejected",
          "business_not_found",
          "personal_workspace_membership_restricted",
        ] as const;
        if (focusedCodes.some((code) => code === error.details.code)) {
          notify({ message: t(`errors.${error.details.code}`), tone: "error" });
          return;
        }

        notify({ message: getErrorMessage(error.details), tone: "error" });
        return;
      }
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm font-medium text-slate-500">{t("eyebrow")}</p>
        <h2 className="mt-1 text-2xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t("description")}
        </p>
      </div>
      <form
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6"
        onSubmit={onSubmit}
      >
        <input type="hidden" {...register("businessId")} />
        <FormField
          description={t("fields.searchHelp")}
          error={errors.businessId?.message}
          htmlFor="business-search"
          label={t("fields.search")}
          required
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoComplete="off"
              autoFocus
              className="pl-9"
              id="business-search"
              onChange={(event) => updateQuery(event.target.value)}
              placeholder={t("fields.searchPlaceholder")}
              value={query}
            />
          </div>
        </FormField>

        {selected ? (
          <div className="flex items-center gap-3 rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-3 dark:border-brand-orange/30 dark:bg-brand-orange/5">
            <Check className="size-4 shrink-0 text-brand-navy dark:text-brand-orange" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{selected.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                @{selected.public_handle} · {selected.country_code}
              </p>
            </div>
          </div>
        ) : !query.trim().replace(/^@/, "") ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("search.minimum")}</p>
        ) : searching ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="size-4 animate-spin" /> {t("search.searching")}
          </p>
        ) : searchFailed ? (
          <p className="text-sm text-red-600 dark:text-red-300">{t("search.failed")}</p>
        ) : results.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {results.map((business) => (
              <button
                className="flex w-full items-center gap-3 border-b border-slate-200 p-3 text-left transition last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                key={business.id}
                onClick={() => selectBusiness(business)}
                type="button"
              >
                <Building2 className="size-4 shrink-0 text-brand-orange" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{business.name}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    @{business.public_handle} · {business.country_code}
                  </span>
                </span>
                <span className="text-xs font-medium text-brand-navy dark:text-brand-orange">
                  {t("search.select")}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("search.empty")}</p>
        )}

        <FormField
          description={t("fields.messageHelp")}
          error={errors.message?.message}
          htmlFor="access-message"
          label={t("fields.message")}
        >
          <Input id="access-message" invalid={Boolean(errors.message)} {...register("message")} />
        </FormField>
        <Button
          className="w-full sm:w-auto"
          disabled={!selected}
          loading={isSubmitting}
          loadingLabel={t("sending")}
          type="submit"
        >
          <UserPlus className="size-4" />
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

export { RequestBusinessAccessForm };
