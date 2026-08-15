import { AvailableItemsWorkspace } from "@/components/commerce/available-items-workspace";
import { CommercePageShell } from "@/components/commerce/commerce-page-shell";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  return (
    <CommercePageShell>
      <AvailableItemsWorkspace businessId={(await params).businessId} />
    </CommercePageShell>
  );
}
