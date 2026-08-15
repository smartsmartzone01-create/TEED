import { CommercePageShell } from "@/components/commerce/commerce-page-shell";
import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  return (
    <CommercePageShell>
      <CommerceWorkspace businessId={(await params).businessId} view="expenses" />
    </CommercePageShell>
  );
}
