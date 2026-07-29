import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { PasswordResetConfirmForm } from "@/components/identity/password-reset-confirm-form";

type PasswordResetNewPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PasswordResetNewPage({
  params,
}: PasswordResetNewPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PasswordResetConfirm");

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <PasswordResetConfirmForm />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
