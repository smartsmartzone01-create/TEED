import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityLayout } from "@/components/identity/identity-layout";
import { RegistrationForm } from "@/components/identity/registration-form";

type RegistrationPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RegistrationPage({
  params,
}: RegistrationPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Signup");

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <RegistrationForm />
    </IdentityLayout>
  );
}
