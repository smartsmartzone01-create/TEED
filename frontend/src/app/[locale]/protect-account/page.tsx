import { setRequestLocale } from "next-intl/server";

import { IdentityAccessBoundary } from "@/components/identity/identity-access-boundary";
import { IdentityLayout } from "@/components/identity/identity-layout";
import { ProtectAccountPanel } from "@/components/identity/protect-account-panel";
import { getProtectAccountCopy } from "@/i18n/messages/identity/protect-account-copy";

type ProtectAccountPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProtectAccountPage({
  params,
}: ProtectAccountPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getProtectAccountCopy(locale);

  return (
    <IdentityLayout
      description={copy.description}
      eyebrow={copy.eyebrow}
      introductionVariant="compact"
      title={copy.title}
    >
      <IdentityAccessBoundary access="dashboard">
        <ProtectAccountPanel destination="/dashboard" showSkip />
      </IdentityAccessBoundary>
    </IdentityLayout>
  );
}
