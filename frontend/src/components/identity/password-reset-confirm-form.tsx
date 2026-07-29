"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createPasswordResetConfirmSchema } from "@/schemas/identity/password-reset";
import { ApiClientError } from "@/services/global/api-client";
import { confirmPasswordReset } from "@/services/identity/password-reset";
import type { PasswordResetConfirmValues } from "@/types/identity/password-reset";

function PasswordResetConfirmForm() {
  const t = useTranslations("PasswordResetConfirm");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { clearSession } = useIdentitySession();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();

  const schema = useMemo(
    () =>
      createPasswordResetConfirmSchema({
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
  } = useForm<PasswordResetConfirmValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await confirmPasswordReset({
        new_password: values.newPassword,
        new_password_confirm: values.newPasswordConfirm,
      });
      clearSession();
      notify({
        message: t("success"),
        tone: "success",
      });
      router.replace("/login");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (
          error.details.code ===
          "password_reset_grant_invalid"
        ) {
          notify({
            message: getErrorMessage(error.details),
            tone: "error",
          });
          router.replace("/forgot-password");
          return;
        }

        const passwordIssue = firstFieldIssue(
          error.details.fieldErrors,
          "new_password",
        );
        const confirmationIssue = firstFieldIssue(
          error.details.fieldErrors,
          "new_password_confirm",
        );

        if (passwordIssue) {
          setError("newPassword", {
            message: getFieldMessage(passwordIssue),
          });
        }

        if (confirmationIssue) {
          setError("newPasswordConfirm", {
            message: getFieldMessage(confirmationIssue),
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
          description={t("passwordHint")}
          error={errors.newPassword?.message}
          htmlFor="new-password"
          label={t("password")}
          required
        >
          <PasswordInput
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="new-password"
            invalid={Boolean(errors.newPassword)}
            showLabel={common("showPassword")}
            {...register("newPassword")}
          />
        </FormField>

        <FormField
          error={errors.newPasswordConfirm?.message}
          htmlFor="new-password-confirm"
          label={t("passwordConfirm")}
          required
        >
          <PasswordInput
            autoComplete="new-password"
            hideLabel={common("hidePassword")}
            id="new-password-confirm"
            invalid={Boolean(errors.newPasswordConfirm)}
            showLabel={common("showPassword")}
            {...register("newPasswordConfirm")}
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
    </>
  );
}

export { PasswordResetConfirmForm };
