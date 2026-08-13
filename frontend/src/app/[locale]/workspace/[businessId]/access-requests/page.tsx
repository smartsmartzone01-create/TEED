import { WorkspaceAccessManagement } from "@/components/workspace/workspace-access-management";
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) { return <WorkspaceAccessManagement businessId={(await params).businessId} view="access"/>; }
