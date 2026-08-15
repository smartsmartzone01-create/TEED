import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";
import { StockCorrectionsPanel } from "@/components/commerce/stock-corrections-panel";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return (
    <>
      <CommerceWorkspace businessId={businessId} view="inventory" />
      <StockCorrectionsPanel businessId={businessId} />
    </>
  );
}
