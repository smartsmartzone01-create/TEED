import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";
import { StockCorrectionsPanel } from "@/components/commerce/stock-corrections-panel";
import { StockRecordingValidationGuard } from "@/components/commerce/stock-recording-validation-guard";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return (
    <>
      <StockRecordingValidationGuard />
      <CommerceWorkspace businessId={businessId} view="inventory" />
      <StockCorrectionsPanel businessId={businessId} />
    </>
  );
}
