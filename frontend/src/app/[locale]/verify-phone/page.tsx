import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { PhoneVerificationForm } from "@/components/identity/phone-verification-form";

type VerifyPhonePageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    phone?: string | string[];
    sent?: string | string[];
  }>;
};

export default async function VerifyPhonePage({ params, searchParams }: VerifyPhonePageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("VerifyPhone");
  const phone = typeof query.phone === "string" ? query.phone : "";

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      introductionVariant="compact"
      notice={t("securityNote")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <PhoneVerificationForm
          initialCooldown={query.sent === "1"}
          initialPhone={phone}
        />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
