"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { createRegistrationFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { registerWithEmail } from "@/services/identity/entry";
import type { RegistrationFormValues } from "@/types/identity/entry";

function RegistrationForm() {
  const t = useTranslations("Signup");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();

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
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await registerWithEmail({
        email: values.email,
        password: values.password,
      });
      const data = response.data;

      if (!data) {
        throw new Error("Registration response data missing.");
      }

      notify({
        message: t("success"),
        tone: "success",
      });

      router.push(
        `/verify-email?email=${encodeURIComponent(data.email)}`,
      );
    } catch (error) {
      if (error instanceof ApiClientError) {
        const emailIssue = firstFieldIssue(
          error.details.fieldErrors,
          "email",
        );
        const passwordIssue = firstFieldIssue(
          error.details.fieldErrors,
          "password",
        );

        if (emailIssue) {
          setError("email", {
            message: getFieldMessage(emailIssue),
          });
        }

        if (passwordIssue) {
          setError("password", {
            message: getFieldMessage(passwordIssue),
          });
        }

        notify({
          message: getErrorMessage(error.details),
          tone: "error",
        });
        return;
      }

      notify({
        message: errorsT("unexpected_error"),
        tone: "error",
      });
    }
  });

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("cardTitle")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("cardDescription")}
        </p>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        <FormField
          error={errors.email?.message}
          htmlFor="registration-email"
          label={t("email")}
          required
        >
          <Input
            aria-describedby={
              errors.email ? "registration-email-error" : undefined
            }
            autoComplete="email"
            id="registration-email"
            invalid={Boolean(errors.email)}
            placeholder={t("emailPlaceholder")}
            type="email"
            {...register("email")}
          />
        </FormField>

        <FormField
          description={t("passwordHint")}
          error={errors.password?.message}
          htmlFor="registration-password"
          label={t("password")}
          required
        >
          <PasswordInput
            aria-describedby={
              errors.password
                ? "registration-password-error"
                : "registration-password-description"
            }
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="registration-password"
            invalid={Boolean(errors.password)}
            showLabel={common("showPassword")}
            {...register("password")}
          />
        </FormField>

        <FormField
          error={errors.passwordConfirm?.message}
          htmlFor="registration-password-confirm"
          label={t("passwordConfirm")}
          required
        >
          <PasswordInput
            aria-describedby={
              errors.passwordConfirm
                ? "registration-password-confirm-error"
                : undefined
            }
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="registration-password-confirm"
            invalid={Boolean(errors.passwordConfirm)}
            showLabel={common("showPassword")}
            {...register("passwordConfirm")}
          />
        </FormField>

        <Button
          className="mt-1 w-full"
          loading={isSubmitting}
          loadingLabel={t("submitting")}
          size="large"
          type="submit"
        >
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          {t("login")}
        </Link>
      </p>
    </>
  );
}

export { RegistrationForm };
