"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { Select } from "@/components/global/primitives/select";
import { GoogleAuthButton } from "@/components/identity/google-auth-button";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { useIdentityTransition } from "@/providers/identity/identity-transition-provider";
import { createLoginFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { loginWithEmail, loginWithPhone } from "@/services/identity/entry";
import type { LoginFormValues } from "@/types/identity/entry";

const CALLING_CODES = {
  KE: "254",
  TZ: "255",
  UG: "256",
} as const;

function normalizePhoneForRoute(
  countryCode: keyof typeof CALLING_CODES,
  phoneNumber: string,
) {
  const compact = phoneNumber.replace(/[\s\-()]/g, "").trim();
  if (compact.startsWith("+")) return compact;

  const callingCode = CALLING_CODES[countryCode];
  let nationalNumber = compact;
  if (nationalNumber.startsWith(callingCode)) {
    nationalNumber = nationalNumber.slice(callingCode.length);
  } else if (nationalNumber.startsWith("0")) {
    nationalNumber = nationalNumber.slice(1);
  }
  return `+${callingCode}${nationalNumber}`;
}

function LoginForm() {
  const t = useTranslations("Login");
  const signupT = useTranslations("Signup");
  const common = useTranslations("IdentityCommon");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { establishSession } = useIdentitySession();
  const { beginTransition, endTransition } = useIdentityTransition();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();

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
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<LoginFormValues>({
    defaultValues: {
      countryCode: "TZ",
      email: "",
      method: "email",
      password: "",
      phoneNumber: "",
    },
    resolver: zodResolver(schema),
  });

  const method = useWatch({ control, name: "method" });

  const onSubmit = handleSubmit(async (values) => {
    beginTransition("authenticating");
    try {
      const response =
        values.method === "email"
          ? await loginWithEmail({
              email: values.email.trim().toLowerCase(),
              password: values.password,
            })
          : await loginWithPhone({
              country_code: values.countryCode,
              phone_number: values.phoneNumber,
              password: values.password,
            });
      const data = response.data;
      if (!data) throw new Error("Login response data missing.");

      establishSession({
        accessToken: data.tokens.access,
        user: {
          countryCode: data.country_code ?? null,
          email: data.email,
          isEmailVerified: data.is_email_verified,
          isOnboardingComplete: data.is_onboarding_complete,
          isPhoneVerified: data.is_phone_verified,
          phoneNumber: data.phone_number ?? null,
          suggestedUsername: data.suggested_username ?? null,
          userId: data.user_id,
          username: data.username,
        },
      });

      notify({ message: t("success"), tone: "success" });
      router.push(data.next_step === "dashboard" ? "/home" : "/onboarding");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.details.code === "email_verification_required") {
          notify({ message: getErrorMessage(error.details), tone: "info" });
          router.push(
            `/verify-email?email=${encodeURIComponent(
              values.email.trim().toLowerCase(),
            )}`,
          );
          return;
        }
        if (error.details.code === "phone_verification_required") {
          notify({ message: getErrorMessage(error.details), tone: "info" });
          const phoneNumber = normalizePhoneForRoute(
            values.countryCode,
            values.phoneNumber,
          );
          router.push(`/verify-phone?phone=${encodeURIComponent(phoneNumber)}`);
          return;
        }

        endTransition();
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
      endTransition();
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{t("cardTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("cardDescription")}
        </p>
      </div>

      <GoogleAuthButton mode="authenticating" />

      <div
        className="mb-5 grid grid-cols-2 gap-2"
        role="group"
        aria-label={t("methodLabel")}
      >
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
          <FormField
            error={errors.email?.message}
            htmlFor="login-email"
            label={t("email")}
            required
          >
            <Input
              autoComplete="email"
              id="login-email"
              invalid={Boolean(errors.email)}
              placeholder={t("emailPlaceholder")}
              type="email"
              {...register("email")}
            />
          </FormField>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <FormField
              error={errors.countryCode?.message}
              htmlFor="login-country"
              label={t("country")}
              required
            >
              <Select
                id="login-country"
                invalid={Boolean(errors.countryCode)}
                {...register("countryCode")}
              >
                <option value="TZ">{t("countries.TZ")}</option>
                <option value="KE">{t("countries.KE")}</option>
                <option value="UG">{t("countries.UG")}</option>
              </Select>
            </FormField>
            <FormField
              error={errors.phoneNumber?.message}
              htmlFor="login-phone"
              label={t("phone")}
              required
            >
              <Input
                autoComplete="tel"
                id="login-phone"
                inputMode="tel"
                invalid={Boolean(errors.phoneNumber)}
                placeholder={t("phonePlaceholder")}
                type="tel"
                {...register("phoneNumber")}
              />
            </FormField>
          </div>
        )}

        <FormField
          error={errors.password?.message}
          htmlFor="login-password"
          label={t("password")}
          required
        >
          <PasswordInput
            autoComplete="current-password"
            hideLabel={common("hidePassword")}
            id="login-password"
            invalid={Boolean(errors.password)}
            showLabel={common("showPassword")}
            {...register("password")}
          />
        </FormField>

        <div className="-mt-2 text-right text-sm">
          <Link
            className="font-semibold text-foreground underline-offset-4 hover:underline"
            href="/forgot-password"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button className="w-full" size="large" type="submit">
          {t("submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")} {" "}
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
