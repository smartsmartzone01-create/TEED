import { setRequestLocale } from "next-intl/server";

import { PreferencesPage } from "@/components/dashboard/preferences/preferences-page";

type PageProps = { params: Promise<{ locale: string }> };

export default async function PreferencesRoute({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PreferencesPage />;
}
