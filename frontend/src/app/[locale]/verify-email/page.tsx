import { getTranslations, setRequestLocale } from "next-intl/server";

import { EmailVerificationForm } from "@/components/identity/email-verification-form";
import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";

type VerifyEmailPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    email?: string | string[];
    sent?: string | string[];
  }>;
};

export default async function VerifyEmailPage({
  params,
  searchParams,
}: VerifyEmailPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations("VerifyEmail");
  const email =
    typeof query.email === "string" ? query.email : "";
  const sent = query.sent === "1";

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      introductionVariant="compact"
      notice={t("securityNote")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <EmailVerificationForm
          initialCooldown={sent}
          initialEmail={email}
        />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
