import { setRequestLocale } from "next-intl/server";

import { ProtectAccountPanel } from "@/components/identity/protect-account-panel";
import { ProfilePage } from "@/components/profile/profile-page";
import { getProtectAccountCopy } from "@/i18n/messages/identity/protect-account-copy";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ProtectContactPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const copy = getProtectAccountCopy(locale);

  return (
    <ProfilePage description={copy.description} title={copy.title}>
      <ProtectAccountPanel
        destination="/dashboard/profile/contacts"
        embedded
      />
    </ProfilePage>
  );
}
