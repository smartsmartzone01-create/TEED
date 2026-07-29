"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { Select } from "@/components/global/primitives/select";
import { useApiErrorMessages } from "@/hooks/global/use-api-error-messages";
import { Link, useRouter } from "@/i18n/navigation";
import { firstFieldIssue } from "@/lib/global/api-errors";
import { useNotification } from "@/providers/global/notification-provider";
import { useIdentitySession } from "@/providers/identity/identity-session-provider";
import { createOnboardingFormSchema } from "@/schemas/identity/entry";
import { ApiClientError } from "@/services/global/api-client";
import { completeOnboarding } from "@/services/identity/entry";
import type { OnboardingFormValues } from "@/types/identity/entry";

function OnboardingForm() {
  const t = useTranslations("Onboarding");
  const common = useTranslations("IdentityCommon");
  const signupT = useTranslations("Signup");
  const errorsT = useTranslations("IdentityErrors");
  const router = useRouter();
  const { notify } = useNotification();
  const { accessToken, status, updateUser, user } =
    useIdentitySession();
  const { getErrorMessage, getFieldMessage } =
    useApiErrorMessages();

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
      countryCode: "TZ",
      phoneNumber: "",
      username: "",
    },
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (status === "initializing") {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {common("restoringSession")}
      </div>
    );
  }

  if (!accessToken || !user) {
      notify({
        message: t("sessionRequired"),
        tone: "error",
      });
      return;
    }

    try {
      const response = await completeOnboarding(
        {
          country_code: values.countryCode,
          phone_number: values.phoneNumber,
          username: values.username,
        },
        accessToken,
      );
      const data = response.data;

      if (!data) {
        throw new Error("Onboarding response data missing.");
      }

      updateUser({
        email: data.email,
        isOnboardingComplete: true,
        userId: data.user_id,
        username: data.username,
      });

      notify({
        message: t("success"),
        tone: "success",
      });
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError) {
        const usernameIssue = firstFieldIssue(
          error.details.fieldErrors,
          "username",
        );
        const countryIssue = firstFieldIssue(
          error.details.fieldErrors,
          "country_code",
        );
        const phoneIssue = firstFieldIssue(
          error.details.fieldErrors,
          "phone_number",
        );

        if (usernameIssue) {
          setError("username", {
            message: getFieldMessage(usernameIssue),
          });
        }

        if (countryIssue) {
          setError("countryCode", {
            message: getFieldMessage(countryIssue),
          });
        }

        if (phoneIssue) {
          setError("phoneNumber", {
            message: getFieldMessage(phoneIssue),
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

  if (!accessToken || !user) {
    return (
      <div className="text-center">
        <p className="text-sm leading-6 text-muted-foreground">
          {t("sessionRequired")}
        </p>
        <Button asChild className="mt-5" size="large">
          <Link href="/login">{signupT("login")}</Link>
        </Button>
      </div>
    );
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
          error={errors.username?.message}
          htmlFor="onboarding-username"
          label={t("username")}
          required
        >
          <Input
            autoComplete="username"
            id="onboarding-username"
            invalid={Boolean(errors.username)}
            placeholder={t("usernamePlaceholder")}
            {...register("username")}
          />
        </FormField>

        <FormField
          error={errors.countryCode?.message}
          htmlFor="onboarding-country"
          label={t("country")}
          required
        >
          <Select
            id="onboarding-country"
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
            type="tel"
            {...register("phoneNumber")}
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

export { OnboardingForm };
