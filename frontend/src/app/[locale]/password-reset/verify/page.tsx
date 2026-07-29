import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { PasswordResetVerifyForm } from "@/components/identity/password-reset-verify-form";

type PasswordResetVerifyPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    email?: string | string[];
    sent?: string | string[];
  }>;
};

export default async function PasswordResetVerifyPage({
  params,
  searchParams,
}: PasswordResetVerifyPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("PasswordResetVerify");
  const email =
    typeof query.email === "string" ? query.email : "";

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <PasswordResetVerifyForm
          initialCooldown={query.sent === "1"}
          initialEmail={email}
        />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
