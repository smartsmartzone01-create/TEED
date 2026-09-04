"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { VerificationCodeInput } from "@/components/identity/verification-code-input";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createPhoneVerificationFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { resendPhoneVerification, verifyPhone } from "@/services/identity/entry";
import type { PhoneVerificationFormValues } from "@/types/identity/entry";

const RESEND_COOLDOWN_SECONDS = 60;

type PhoneVerificationFormProps = {
  initialCooldown?: boolean;
  initialPhone?: string;
};

function PhoneVerificationForm({
  initialCooldown = false,
  initialPhone = "",
}: PhoneVerificationFormProps) {
  const t = useTranslations("VerifyPhone");
  const signupT = useTranslations("Signup");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { establishSession } = useIdentitySession();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();
  const [cooldown, setCooldown] = useState(initialCooldown ? RESEND_COOLDOWN_SECONDS : 0);
  const [isResending, setIsResending] = useState(false);

  const schema = useMemo(
    () =>
      createPhoneVerificationFormSchema({
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
    getValues,
    handleSubmit,
    register,
    setError,
  } = useForm<PhoneVerificationFormValues>({
    defaultValues: { code: "", phoneNumber: initialPhone },
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await verifyPhone({
        code: values.code.trim(),
        phone_number: values.phoneNumber.trim(),
      });
      const data = response.data;
      if (!data) throw new Error("Phone verification response data missing.");

      establishSession({
        accessToken: data.tokens.access,
        user: {
          countryCode: data.country_code,
          email: data.email,
          isEmailVerified: false,
          isOnboardingComplete: false,
          isPhoneVerified: true,
          phoneNumber: data.phone_number,
          userId: data.user_id,
          username: null,
        },
      });
      notify({ message: t("success"), tone: "success" });
      router.push("/onboarding");
    } catch (error) {
      if (error instanceof ApiClientError) {
        const phoneIssue = firstFieldIssue(error.details.fieldErrors, "phone_number");
        const codeIssue = firstFieldIssue(error.details.fieldErrors, "code");
        if (phoneIssue) setError("phoneNumber", { message: getFieldMessage(phoneIssue) });
        if (codeIssue) setError("code", { message: getFieldMessage(codeIssue) });
        notify({ message: getErrorMessage(error.details), tone: "error" });
        return;
      }
      notify({ message: errorsT("unexpected_error"), tone: "error" });
    }
  });

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    const phone = getValues("phoneNumber").trim();
    if (!phone) {
      setError("phoneNumber", { message: signupT("validation.phone") });
      return;
    }
    setIsResending(true);
    try {
      await resendPhoneVerification(phone);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      notify({ message: t("resendSuccess"), tone: "success" });
    } catch (error) {
      notify({
        message: error instanceof ApiClientError ? getErrorMessage(error.details) : errorsT("unexpected_error"),
        tone: "error",
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">{t("cardTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("cardDescription")}</p>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        <FormField error={errors.phoneNumber?.message} htmlFor="verify-phone-number" label={t("phone")} required>
          <Input id="verify-phone-number" inputMode="tel" invalid={Boolean(errors.phoneNumber)} type="tel" {...register("phoneNumber")} />
        </FormField>
        <FormField error={errors.code?.message} htmlFor="verify-phone-code" label={t("code")} required>
          <VerificationCodeInput id="verify-phone-code" invalid={Boolean(errors.code)} placeholder={t("codePlaceholder")} {...register("code")} />
        </FormField>
        <Button className="w-full" loading={isSubmitting} loadingLabel={t("submitting")} size="large" type="submit">
          {t("submit")}
        </Button>
      </form>

      <div className="mt-5 grid gap-3 text-center text-sm">
        <Button disabled={cooldown > 0} loading={isResending} onClick={handleResend} type="button" variant="ghost">
          {cooldown > 0 ? t("resendWait", { seconds: cooldown }) : t("resend")}
        </Button>
        <Link className="font-semibold text-foreground underline-offset-4 hover:underline" href="/register">
          {t("wrongPhone")}
        </Link>
      </div>
    </>
  );
}

export { PhoneVerificationForm };
