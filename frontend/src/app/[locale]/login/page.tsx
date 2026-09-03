import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { LoginForm } from "@/components/identity/login-form";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({
  params,
}: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Login");

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      introductionVariant="compact"
      title={t("title")}
    >
      <IdentityAccessBoundary access="guest">
        <LoginForm />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
