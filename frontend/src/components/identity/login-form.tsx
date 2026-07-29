"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createLoginFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { loginWithEmail } from "@/services/identity/entry";
import type { LoginFormValues } from "@/types/identity/entry";

function LoginForm() {
  const t = useTranslations("Login");
  const signupT = useTranslations("Signup");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { establishSession } = useIdentitySession();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();

  const schema = useMemo(
    () =>
      createLoginFormSchema({
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

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await loginWithEmail(values);
      const data = response.data;

      if (!data) {
        throw new Error("Login response data missing.");
      }

      establishSession({
        accessToken: data.tokens.access,
        user: {
          email: data.email,
          isOnboardingComplete:
            data.is_onboarding_complete,
          userId: data.user_id,
          username: data.username,
        },
      });

      notify({
        message: t("success"),
        tone: "success",
      });

      router.push(
        data.next_step === "dashboard"
          ? "/dashboard"
          : "/onboarding",
      );
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (
          error.details.code ===
          "email_verification_required"
        ) {
          notify({
            message: getErrorMessage(error.details),
            tone: "info",
          });
          router.push(
            `/verify-email?email=${encodeURIComponent(
              values.email.trim().toLowerCase(),
            )}`,
          );
          return;
        }

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
          htmlFor="login-email"
          label={t("email")}
          required
        >
          <Input
            aria-describedby={
              errors.email ? "login-email-error" : undefined
            }
            autoComplete="email"
            id="login-email"
            invalid={Boolean(errors.email)}
            placeholder={t("emailPlaceholder")}
            type="email"
            {...register("email")}
          />
        </FormField>

        <FormField
          error={errors.password?.message}
          htmlFor="login-password"
          label={t("password")}
          required
        >
          <PasswordInput
            aria-describedby={
              errors.password ? "login-password-error" : undefined
            }
            autoComplete="current-password"
            hideLabel={common("hidePassword")}
            id="login-password"
            invalid={Boolean(errors.password)}
            showLabel={common("showPassword")}
            {...register("password")}
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
        {t("noAccount")}{" "}
        <Link
          className="font-semibold text-foreground underline-offset-4 hover:underline"
          href="/register"
        >
          {t("signup")}
        </Link>
      </p>
    </>
  );
}

export { LoginForm };
