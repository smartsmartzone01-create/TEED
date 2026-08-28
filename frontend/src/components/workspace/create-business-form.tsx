"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, LockKeyhole, UserRound } from "lucide-react";
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
import type { CreateBusinessValues, WorkspaceType } from "@/types/workspace/workspace";

const workspaceChoices: Array<{
  icon: typeof BriefcaseBusiness;
  key: "business" | "personal";
  value: WorkspaceType;
}> = [
  { icon: BriefcaseBusiness, key: "business", value: "business" },
  { icon: UserRound, key: "personal", value: "personal_brand" },
];

function CreateBusinessForm() {
  const t = useTranslations("WorkspaceRefinement.create");
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
        workspaceType: t("validation.class"),
      }),
    [t],
  );
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    watch,
  } = useForm<CreateBusinessValues>({
    defaultValues: {
      countryCode: "TZ",
      name: "",
      workspaceType: "business",
    },
    resolver: zodResolver(schema),
  });
  const workspaceType = watch("workspaceType");

  const onSubmit = handleSubmit(async (values) => {
    try {
      const workspace = await createBusiness(values);
      notify({ message: t("success"), tone: "success" });
      router.push(`/workspace/${workspace.id}`);
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
    <div className="mx-auto max-w-3xl space-y-5">
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
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">{t("class")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaceChoices.map(({ icon: Icon, key, value }) => {
              const selected = workspaceType === value;
              return (
                <label
                  className={[
                    "cursor-pointer rounded-2xl border p-4 transition",
                    selected
                      ? "border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange/20"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700",
                  ].join(" ")}
                  key={value}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    value={value}
                    {...register("workspaceType")}
                  />
                  <span className="flex items-start gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <strong className="block text-sm">{t(`${key}.title`)}</strong>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t(`${key}.description`)}
                      </span>
                      <span className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {key === "personal" ? <LockKeyhole className="size-3.5" /> : null}
                        {t(`${key}.impact`)}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.workspaceType?.message ? (
            <p className="text-xs font-medium text-red-600">{errors.workspaceType.message}</p>
          ) : null}
        </fieldset>

        <FormField
          error={errors.name?.message}
          htmlFor="business-name"
          label={t("name")}
          required
        >
          <Input autoFocus id="business-name" invalid={Boolean(errors.name)} {...register("name")} />
        </FormField>

        <FormField
          error={errors.countryCode?.message}
          htmlFor="business-country"
          label={t("country")}
          required
        >
          <Select id="business-country" invalid={Boolean(errors.countryCode)} {...register("countryCode")}>
            <option value="TZ">{t("countries.TZ")}</option>
            <option value="KE">{t("countries.KE")}</option>
            <option value="UG">{t("countries.UG")}</option>
          </Select>
        </FormField>

        <Button
          className="w-full sm:w-auto"
          loading={isSubmitting}
          loadingLabel={t("creating")}
          type="submit"
        >
          <BriefcaseBusiness className="size-4" />
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}

export { CreateBusinessForm };
