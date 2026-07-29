"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { createPasswordResetVerifySchema } from "@/schemas/identity/password-reset";
import { ApiClientError } from "@/services/global/api-client";
import {
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/services/identity/password-reset";
import type { PasswordResetVerifyValues } from "@/types/identity/password-reset";

const RESET_RESEND_COOLDOWN_SECONDS = 60;

type PasswordResetVerifyFormProps = {
  initialCooldown?: boolean;
  initialEmail?: string;
};

function PasswordResetVerifyForm({
  initialCooldown = false,
  initialEmail = "",
}: PasswordResetVerifyFormProps) {
  const t = useTranslations("PasswordResetVerify");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();
  const [cooldown, setCooldown] = useState(
    initialCooldown ? RESET_RESEND_COOLDOWN_SECONDS : 0,
  );
  const [isResending, setIsResending] = useState(false);

  const schema = useMemo(
    () =>
      createPasswordResetVerifySchema({
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
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<PasswordResetVerifyValues>({
    defaultValues: {
      code: "",
      email: initialEmail,
    },
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await verifyPasswordResetCode({
        code: values.code.trim(),
        email: values.email.trim().toLowerCase(),
      });
      notify({
        message: t("success"),
        tone: "success",
      });
      router.push("/password-reset/new");
    } catch (error) {
      if (error instanceof ApiClientError) {
        const emailIssue = firstFieldIssue(
          error.details.fieldErrors,
          "email",
        );
        const codeIssue = firstFieldIssue(
          error.details.fieldErrors,
          "code",
        );

        if (emailIssue) {
          setError("email", {
            message: getFieldMessage(emailIssue),
          });
        }

        if (codeIssue) {
          setError("code", {
            message: getFieldMessage(codeIssue),
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

  async function handleResend() {
    if (cooldown > 0 || isResending) {
      return;
    }

    const emailResult = schema.shape.email.safeParse(
      getValues("email"),
    );

    if (!emailResult.success) {
      setError("email", {
        message: emailResult.error.issues[0]?.message,
      });
      return;
    }

    setIsResending(true);

    try {
      await requestPasswordReset(
        emailResult.data.trim().toLowerCase(),
      );
      setCooldown(RESET_RESEND_COOLDOWN_SECONDS);
      notify({
        message: t("resendSuccess"),
        tone: "success",
      });
    } catch (error) {
      notify({
        message:
          error instanceof ApiClientError
            ? getErrorMessage(error.details)
            : errorsT("unexpected_error"),
        tone: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

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
          htmlFor="password-reset-verify-email"
          label={t("email")}
          required
        >
          <Input
            autoComplete="email"
            id="password-reset-verify-email"
            invalid={Boolean(errors.email)}
            type="email"
            {...register("email")}
          />
        </FormField>

        <FormField
          error={errors.code?.message}
          htmlFor="password-reset-code"
          label={t("code")}
          required
        >
          <Input
            autoComplete="one-time-code"
            id="password-reset-code"
            inputMode="numeric"
            invalid={Boolean(errors.code)}
            maxLength={12}
            placeholder={t("codePlaceholder")}
            {...register("code")}
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

      <div className="mt-5 grid gap-3 text-center text-sm">
        <Button
          disabled={cooldown > 0}
          loading={isResending}
          onClick={handleResend}
          type="button"
          variant="ghost"
        >
          {cooldown > 0
            ? t("resendWait", { seconds: cooldown })
            : t("resend")}
        </Button>
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          {t("changeEmail")}
        </Link>
      </div>
    </>
  );
}

export { PasswordResetVerifyForm };
