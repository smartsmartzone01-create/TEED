"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useWorkspace } from "@/providers/workspace/workspace-provider";
import { createBusinessFormSchema } from "@/schemas/workspace/workspace";
import { ApiClientError } from "@/services/global/api-client";
import type { CreateBusinessValues } from "@/types/workspace/workspace";

function CreateBusinessForm() {
  const t = useTranslations("WorkspaceCreate");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const { notify } = useNotification();
  const { createBusiness } = useWorkspace();
  const schema = useMemo(
    () =>
      createBusinessFormSchema({
        country: t("validation.country"),
        name: t("validation.name"),
        workspaceType: t("validation.workspaceType"),
      }),
    [t],
  );
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<CreateBusinessValues>({ defaultValues: { countryCode: "TZ", name: "", workspaceType: "business" }, resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const business = await createBusiness(values);
      notify({ message: t("success"), tone: "success" });
      router.push(`/workspace/${business.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const nameIssue = firstFieldIssue(error.details.fieldErrors, "name");
        const countryIssue = firstFieldIssue(error.details.fieldErrors, "country_code");
        const typeIssue = firstFieldIssue(error.details.fieldErrors, "workspace_type");
        if (nameIssue) setError("name", { message: getFieldMessage(nameIssue) });
        if (countryIssue) setError("countryCode", { message: getFieldMessage(countryIssue) });
        if (typeIssue) setError("workspaceType", { message: getFieldMessage(typeIssue) });
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
        <FormField error={errors.name?.message} htmlFor="business-name" label={t("fields.name")} required><Input autoFocus id="business-name" invalid={Boolean(errors.name)} {...register("name")} /></FormField>
        <FormField error={errors.countryCode?.message} htmlFor="business-country" label={t("fields.country")} required><Select id="business-country" invalid={Boolean(errors.countryCode)} {...register("countryCode")}><option value="TZ">{t("countries.TZ")}</option><option value="KE">{t("countries.KE")}</option><option value="UG">{t("countries.UG")}</option></Select></FormField>
        <FormField description={t("fields.workspaceTypeHelp")} error={errors.workspaceType?.message} htmlFor="workspace-type" label={t("fields.workspaceType")} required>
          <Select id="workspace-type" invalid={Boolean(errors.workspaceType)} {...register("workspaceType")}>
            <option value="business">{t("types.business")}</option>
            <option value="service_provider">{t("types.service_provider")}</option>
            <option value="creator_brand">{t("types.creator_brand")}</option>
            <option value="personal">{t("types.personal")}</option>
            <option value="other">{t("types.other")}</option>
          </Select>
        </FormField>
        <Button className="w-full sm:w-auto" loading={isSubmitting} loadingLabel={t("creating")} type="submit"><Building2 className="size-4" />{t("submit")}</Button>
      </form>
    </div>
  );
}

export { CreateBusinessForm };
