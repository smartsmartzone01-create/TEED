"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { Select } from "@/components/global/primitives/select";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { createRegistrationFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { registerWithEmail, registerWithPhone } from "@/services/identity/entry";
import type { RegistrationFormValues } from "@/types/identity/entry";

function RegistrationForm() {
  const t = useTranslations("Signup");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();

  const schema = useMemo(
    () =>
      createRegistrationFormSchema({
        code: t("validation.code"),
        email: t("validation.email"),
        password: t("validation.password"),
        passwordMatch: t("validation.passwordMatch"),
        passwordMinimum: t("validation.passwordMinimum"),
        phone: t("validation.phone"),
        username: t("validation.username"),
      }),
    [t],
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
  } = useForm<RegistrationFormValues>({
    defaultValues: {
      countryCode: "TZ",
      email: "",
      method: "email",
      password: "",
      passwordConfirm: "",
      phoneNumber: "",
    },
    resolver: zodResolver(schema),
  });

  const method = watch("method");

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (values.method === "email") {
        const response = await registerWithEmail({
          email: values.email.trim().toLowerCase(),
          password: values.password,
        });
        const data = response.data;
        if (!data) throw new Error("Registration response data missing.");
        notify({ message: t("successEmail"), tone: "success" });
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}&sent=1`);
        return;
      }

      const response = await registerWithPhone({
        country_code: values.countryCode,
        phone_number: values.phoneNumber,
        password: values.password,
      });
      const data = response.data;
      if (!data) throw new Error("Registration response data missing.");
      notify({ message: t("successPhone"), tone: "success" });
      router.push(`/verify-phone?phone=${encodeURIComponent(data.phone_number)}&sent=1`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const mappings = [
          ["email", "email"],
          ["phone_number", "phoneNumber"],
          ["country_code", "countryCode"],
          ["password", "password"],
        ] as const;
        for (const [apiField, formField] of mappings) {
          const issue = firstFieldIssue(error.details.fieldErrors, apiField);
          if (issue) setError(formField, { message: getFieldMessage(issue) });
        }
        notify({ message: getErrorMessage(error.details), tone: "error" });
        return;
      }
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{t("cardTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("cardDescription")}</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2" role="group" aria-label={t("methodLabel")}>
        <Button
          type="button"
          variant={method === "email" ? "default" : "outline"}
          onClick={() => setValue("method", "email", { shouldValidate: true })}
        >
          {t("methodEmail")}
        </Button>
        <Button
          type="button"
          variant={method === "phone" ? "default" : "outline"}
          onClick={() => setValue("method", "phone", { shouldValidate: true })}
        >
          {t("methodPhone")}
        </Button>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        {method === "email" ? (
          <FormField error={errors.email?.message} htmlFor="registration-email" label={t("email")} required>
            <Input
              autoComplete="email"
              id="registration-email"
              invalid={Boolean(errors.email)}
              placeholder={t("emailPlaceholder")}
              type="email"
              {...register("email")}
            />
          </FormField>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField error={errors.countryCode?.message} htmlFor="registration-country" label={t("country")} required>
              <Select id="registration-country" invalid={Boolean(errors.countryCode)} {...register("countryCode")}>
                <option value="TZ">{t("countries.TZ")}</option>
                <option value="KE">{t("countries.KE")}</option>
                <option value="UG">{t("countries.UG")}</option>
              </Select>
            </FormField>
            <FormField error={errors.phoneNumber?.message} htmlFor="registration-phone" label={t("phone")} required>
              <Input
                autoComplete="tel"
                id="registration-phone"
                inputMode="tel"
                invalid={Boolean(errors.phoneNumber)}
                placeholder={t("phonePlaceholder")}
                type="tel"
                {...register("phoneNumber")}
              />
            </FormField>
          </div>
        )}

        <FormField description={t("passwordHint")} error={errors.password?.message} htmlFor="registration-password" label={t("password")} required>
          <PasswordInput
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="registration-password"
            invalid={Boolean(errors.password)}
            showLabel={common("showPassword")}
            {...register("password")}
          />
        </FormField>

        <FormField error={errors.passwordConfirm?.message} htmlFor="registration-password-confirm" label={t("passwordConfirm")} required>
          <PasswordInput
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="registration-password-confirm"
            invalid={Boolean(errors.passwordConfirm)}
            showLabel={common("showPassword")}
            {...register("passwordConfirm")}
          />
        </FormField>

        <Button className="mt-1 w-full" loading={isSubmitting} loadingLabel={t("submitting")} size="large" type="submit">
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")} {" "}
        <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/login">
          {t("login")}
        </Link>
      </p>
    </>
  );
}

export { RegistrationForm };
