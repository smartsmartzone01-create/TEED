import { setRequestLocale } from "next-intl/server";

import { WorkspaceCapabilityDirectory } from "@/components/workspace/workspace-capability-directory";

type WorkspaceDirectoryPageProps = {
  params: Promise<{ businessId: string; locale: string }>;
};

export default async function WorkspaceDirectoryPage({ params }: WorkspaceDirectoryPageProps) {
  const { businessId, locale } = await params;
  setRequestLocale(locale);
  return <WorkspaceCapabilityDirectory businessId={businessId} />;
}
