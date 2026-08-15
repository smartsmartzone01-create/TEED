import { AvailableItemsWorkspace } from "@/components/commerce/catalog/available-items-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <CommercePageShell><AvailableItemsWorkspace businessId={(await params).businessId} /></CommercePageShell>;
}
