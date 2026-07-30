import { setRequestLocale } from "next-intl/server";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";

type PageProps = { params: Promise<{ locale: string }> };

export default async function HelpPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DashboardPlaceholder section="help" />;
}
