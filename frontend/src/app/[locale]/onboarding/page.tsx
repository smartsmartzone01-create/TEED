import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { OnboardingForm } from "@/components/identity/onboarding-form";

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({
  params,
}: OnboardingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Onboarding");

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <IdentityAccessBoundary access="onboarding">
        <OnboardingForm />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
