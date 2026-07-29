import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { PasswordResetRequestForm } from "@/components/identity/password-reset-request-form";

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PasswordResetRequest");

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <PasswordResetRequestForm />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
