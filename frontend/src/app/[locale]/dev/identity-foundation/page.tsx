import { getTranslations, setRequestLocale } from "next-intl/server";

import { IdentityFoundationPreview } from "@/components/identity/identity-foundation-preview";
import { IdentityLayout } from "@/components/identity/identity-layout";

type IdentityFoundationPreviewPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function IdentityFoundationPreviewPage({
  params,
}: IdentityFoundationPreviewPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations(
    "IdentityFoundationPreview",
  );

  return (
    <IdentityLayout
      description={t("description")}
      eyebrow={t("eyebrow")}
      title={t("title")}
    >
      <IdentityFoundationPreview />
    </IdentityLayout>
  );
}
