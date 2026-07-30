import { setRequestLocale } from "next-intl/server";

import { ProfileOverview } from "@/components/profile/profile-overview";

type PageProps = { params: Promise<{ locale: string }> };

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileOverview />;
}
