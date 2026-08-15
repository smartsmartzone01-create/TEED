import { CommerceOverviewWorkspace } from "@/components/commerce/overview/commerce-overview-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return (
    <CommercePageShell>
      <CommerceOverviewWorkspace businessId={businessId} />
    </CommercePageShell>
  );
}
