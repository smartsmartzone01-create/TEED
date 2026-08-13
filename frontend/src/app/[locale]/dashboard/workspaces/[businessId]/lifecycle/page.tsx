import { setRequestLocale } from "next-intl/server";

import { DashboardBusinessLifecycle } from "@/components/workspace/dashboard-business-lifecycle";

type PageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function BusinessLifecyclePage({ params }: PageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <DashboardBusinessLifecycle businessId={businessId} />;
}
