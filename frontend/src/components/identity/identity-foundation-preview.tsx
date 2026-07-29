"use client";

import { useTranslations } from "next-intl";
import type { FormEvent } from "react";

import { Button } from "@/components/global/primitives/button";
import { FormField } from "@/components/global/primitives/form-field";
import { Input } from "@/components/global/primitives/input";
import { PasswordInput } from "@/components/global/primitives/password-input";
import { useNotification } from "@/providers/global/notification-provider";

function IdentityFoundationPreview() {
  const t = useTranslations("IdentityFoundationPreview");
  const common = useTranslations("IdentityCommon");
  const { notify } = useNotification();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    notify({
      message: t("successMessage"),
      title: t("successTitle"),
      tone: "success",
    });
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

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <FormField
          htmlFor="identity-preview-email"
          label={t("email")}
          required
        >
          <Input
            autoComplete="email"
            id="identity-preview-email"
            name="email"
            placeholder={t("emailPlaceholder")}
            required
            type="email"
          />
        </FormField>

        <FormField
          description={t("passwordHint")}
          htmlFor="identity-preview-password"
          label={t("password")}
          required
        >
          <PasswordInput
            autoComplete="current-password"
            hideLabel={common("hidePassword")}
            id="identity-preview-password"
            minLength={8}
            name="password"
            required
            showLabel={common("showPassword")}
          />
        </FormField>

        <Button className="mt-1 w-full" size="large" type="submit">
          {t("submit")}
        </Button>
      </form>
    </>
  );
}

export { IdentityFoundationPreview };
