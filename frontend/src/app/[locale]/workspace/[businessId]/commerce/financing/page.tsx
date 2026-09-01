import { FinancingWorkspace } from "@/components/commerce/financing/financing-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  return (
    <CommercePageShell>
      <FinancingWorkspace businessId={(await params).businessId} />
    </CommercePageShell>
  );
}
