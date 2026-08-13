import { WorkspaceAdministrationOverview } from "@/components/workspace/workspace-administration-overview";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <WorkspaceAdministrationOverview businessId={(await params).businessId} />;
}
