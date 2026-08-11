import { setRequestLocale } from "next-intl/server";

import { WorkspaceOverview } from "@/components/workspace/workspace-overview";

type WorkspacePageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WorkspaceBusinessPage({ params }: WorkspacePageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WorkspaceOverview businessId={businessId} />;
}
