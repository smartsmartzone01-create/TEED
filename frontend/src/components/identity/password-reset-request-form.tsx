"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { createPasswordResetRequestSchema } from "@/schemas/identity/password-reset";
import { ApiClientError } from "@/services/global/api-client";
import { requestPasswordReset } from "@/services/identity/password-reset";
import type { PasswordResetRequestValues } from "@/types/identity/password-reset";

function PasswordResetRequestForm() {
  const t = useTranslations("PasswordResetRequest");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();

  const schema = useMemo(
    () =>
      createPasswordResetRequestSchema({
        code: t("validation.code"),
        email: t("validation.email"),
        password: t("validation.password"),
        passwordMatch: t("validation.passwordMatch"),
        passwordMinimum: t("validation.passwordMinimum"),
      }),
    [t],
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<PasswordResetRequestValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    const email = values.email.trim().toLowerCase();

    try {
      await requestPasswordReset(email);
      notify({
        message: t("success"),
        tone: "success",
      });
      router.push(
        `/password-reset/verify?email=${encodeURIComponent(
          email,
        )}&sent=1`,
      );
    } catch (error) {
      if (error instanceof ApiClientError) {
        const emailIssue = firstFieldIssue(
          error.details.fieldErrors,
          "email",
        );

        if (emailIssue) {
          setError("email", {
            message: getFieldMessage(emailIssue),
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
          htmlFor="password-reset-email"
          label={t("email")}
          required
        >
          <Input
            autoComplete="email"
            id="password-reset-email"
            invalid={Boolean(errors.email)}
            placeholder={t("emailPlaceholder")}
            type="email"
            {...register("email")}
          />
        </FormField>

        <Button
          className="w-full"
          loading={isSubmitting}
          loadingLabel={t("submitting")}
          size="large"
          type="submit"
        >
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/login"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </>
  );
}

export { PasswordResetRequestForm };
