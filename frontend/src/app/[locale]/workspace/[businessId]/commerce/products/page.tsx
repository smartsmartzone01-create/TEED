import { AvailableItemsWorkspace } from "@/components/commerce/available-items-workspace";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <AvailableItemsWorkspace businessId={(await params).businessId} />;
}
