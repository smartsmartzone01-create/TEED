"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createVerificationFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import {
  resendEmailVerification,
  verifyEmail,
} from "@/services/identity/entry";

const RESEND_COOLDOWN_SECONDS = 60;

type EmailVerificationFormProps = {
  initialCooldown?: boolean;
  initialEmail?: string;
};

function EmailVerificationForm({
  initialCooldown = false,
  initialEmail = "",
}: EmailVerificationFormProps) {
  const t = useTranslations("VerifyEmail");
  const signupT = useTranslations("Signup");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { establishSession } = useIdentitySession();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();
  const [cooldown, setCooldown] = useState(
    initialCooldown ? RESEND_COOLDOWN_SECONDS : 0,
  );
  const [isResending, setIsResending] = useState(false);

  const schema = useMemo(
    () =>
      createVerificationFormSchema({
        code: signupT("validation.code"),
        email: signupT("validation.email"),
        password: signupT("validation.password"),
        passwordMatch: signupT("validation.passwordMatch"),
        passwordMinimum: signupT("validation.passwordMinimum"),
        phone: signupT("validation.phone"),
        username: signupT("validation.username"),
      }),
    [signupT],
  );

  type VerificationFormValues = z.infer<typeof schema>;

  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<VerificationFormValues>({
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
      const response = await verifyEmail(values);
      const data = response.data;

      if (!data) {
        throw new Error("Verification response data missing.");
      }

      establishSession({
        accessToken: data.tokens.access,
        user: {
          email: data.email,
          isOnboardingComplete: false,
          userId: data.user_id,
          username: null,
        },
      });

      notify({
        message: t("success"),
        tone: "success",
      });
      router.push("/onboarding");
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
      await resendEmailVerification(emailResult.data);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      notify({
        message: t("resendSuccess"),
        tone: "success",
      });
    } catch (error) {
      if (error instanceof ApiClientError) {
        notify({
          message: getErrorMessage(error.details),
          tone: "error",
        });
      } else {
        notify({
          message: errorsT("unexpected_error"),
          tone: "error",
        });
      }
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
          htmlFor="verification-email"
          label={t("email")}
          required
        >
          <Input
            autoComplete="email"
            id="verification-email"
            invalid={Boolean(errors.email)}
            type="email"
            {...register("email")}
          />
        </FormField>

        <FormField
          error={errors.code?.message}
          htmlFor="verification-code"
          label={t("code")}
          required
        >
          <Input
            autoComplete="one-time-code"
            id="verification-code"
            inputMode="numeric"
            invalid={Boolean(errors.code)}
            maxLength={6}
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

        <Button
          disabled={cooldown > 0}
          loading={isResending}
          loadingLabel={t("resending")}
          onClick={handleResend}
          type="button"
          variant="outline"
        >
          {cooldown > 0
            ? t("resendWait", { seconds: cooldown })
            : t("resend")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/register"
        >
          {t("wrongEmail")}
        </Link>
      </p>
    </>
  );
}

export { EmailVerificationForm };
