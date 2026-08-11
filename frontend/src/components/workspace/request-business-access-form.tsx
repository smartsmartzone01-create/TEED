"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
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
import type { RequestBusinessAccessValues } from "@/types/workspace/workspace";

function RequestBusinessAccessForm() {
  const t = useTranslations("WorkspaceAccess");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const { notify } = useNotification();
  const { requestAccess } = useWorkspace();
  const schema = useMemo(() => createAccessRequestFormSchema({ businessId: t("validation.businessId"), message: t("validation.message") }), [t]);
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<RequestBusinessAccessValues>({ defaultValues: { businessId: "", message: "" }, resolver: zodResolver(schema) });

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
        notify({ message: getErrorMessage(error.details), tone: "error" });
        return;
      }
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><p className="text-sm font-medium text-slate-500">{t("eyebrow")}</p><h2 className="mt-1 text-2xl font-semibold">{t("title")}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t("description")}</p></div>
      <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6" onSubmit={onSubmit}>
        <FormField description={t("fields.businessIdHelp")} error={errors.businessId?.message} htmlFor="business-id" label={t("fields.businessId")} required><Input autoFocus id="business-id" invalid={Boolean(errors.businessId)} placeholder="00000000-0000-0000-0000-000000000000" {...register("businessId")} /></FormField>
        <FormField description={t("fields.messageHelp")} error={errors.message?.message} htmlFor="access-message" label={t("fields.message")}><Input id="access-message" invalid={Boolean(errors.message)} {...register("message")} /></FormField>
        <Button className="w-full sm:w-auto" loading={isSubmitting} loadingLabel={t("sending")} type="submit"><UserPlus className="size-4" />{t("submit")}</Button>
      </form>
    </div>
  );
}

export { RequestBusinessAccessForm };
