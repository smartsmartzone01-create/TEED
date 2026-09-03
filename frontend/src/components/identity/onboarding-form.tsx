"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createOnboardingFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { completeOnboarding } from "@/services/identity/entry";
import type { OnboardingFormValues } from "@/types/identity/entry";

function supportedCountry(value?: string | null): "KE" | "TZ" | "UG" {
  return value === "KE" || value === "UG" || value === "TZ" ? value : "TZ";
}

function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const signupT = useTranslations("Signup");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { accessToken, clearSession, refreshAccessToken, updateUser, user } = useIdentitySession();
  const { getErrorMessage, getFieldMessage } = useApiErrorMessages();

  const schema = useMemo(
    () =>
      createOnboardingFormSchema({
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
  } = useForm<OnboardingFormValues>({
    defaultValues: {
      countryCode: supportedCountry(user?.countryCode),
      phoneNumber: user?.phoneNumber ?? "",
      username: "",
    },
    resolver: zodResolver(schema),
  });

  const verifiedRegistrationPhone = Boolean(user?.isPhoneVerified && user.phoneNumber);

  const onSubmit = handleSubmit(async (values) => {
    if (!accessToken || !user) {
      notify({ message: t("sessionRequired"), tone: "error" });
      return;
    }

    const submitOnboarding = (token: string) =>
      completeOnboarding(
        {
          country_code: values.countryCode,
          phone_number: values.phoneNumber,
          username: values.username,
        },
        token,
      );

    try {
      let response;
      try {
        response = await submitOnboarding(accessToken);
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.details.kind !== "unauthenticated") {
          throw error;
        }
        response = await submitOnboarding(await refreshAccessToken());
      }

      const data = response.data;
      if (!data) throw new Error("Onboarding response data missing.");

      updateUser({
        countryCode: data.country_code,
        email: data.email,
        isOnboardingComplete: true,
        isPhoneVerified: user.isPhoneVerified,
        phoneNumber: data.phone_number,
        userId: data.user_id,
        username: data.username,
      });
      notify({ message: t("success"), tone: "success" });
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.details.kind === "unauthenticated") {
          clearSession();
          notify({ message: getErrorMessage(error.details), tone: "error" });
          router.replace("/login");
          return;
        }
        const mappings = [
          ["username", "username"],
          ["country_code", "countryCode"],
          ["phone_number", "phoneNumber"],
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
        <div aria-label={t("eyebrow")} className="mb-5 flex items-center gap-2" role="img">
          <span className="h-1.5 flex-1 rounded-full bg-[var(--brand-red)]" />
          <span className="h-1.5 flex-1 rounded-full bg-[var(--brand-green)]" />
          <span className="h-1.5 flex-1 rounded-full bg-primary" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{t("cardTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("cardDescription")}</p>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        <FormField error={errors.username?.message} htmlFor="onboarding-username" label={t("username")} required>
          <Input autoComplete="username" id="onboarding-username" invalid={Boolean(errors.username)} placeholder={t("usernamePlaceholder")} {...register("username")} />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <FormField error={errors.countryCode?.message} htmlFor="onboarding-country" label={t("country")} required>
            <Select id="onboarding-country" invalid={Boolean(errors.countryCode)} {...register("countryCode")}>
              <option value="TZ">{t("countries.TZ")}</option>
              <option value="KE">{t("countries.KE")}</option>
              <option value="UG">{t("countries.UG")}</option>
            </Select>
          </FormField>
          <FormField
            description={verifiedRegistrationPhone ? t("verifiedPhone") : undefined}
            error={errors.phoneNumber?.message}
            htmlFor="onboarding-phone"
            label={t("phone")}
            required
          >
            <Input
              autoComplete="tel"
              id="onboarding-phone"
              inputMode="tel"
              invalid={Boolean(errors.phoneNumber)}
              placeholder={t("phonePlaceholder")}
              readOnly={verifiedRegistrationPhone}
              type="tel"
              {...register("phoneNumber")}
            />
          </FormField>
        </div>

        <Button className="w-full" loading={isSubmitting} loadingLabel={t("submitting")} size="large" type="submit">
          {t("submit")}
        </Button>
      </form>
    </>
  );
}

export { OnboardingForm };
