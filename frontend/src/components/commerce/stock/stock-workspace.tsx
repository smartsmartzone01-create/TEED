import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";
import { StockCorrectionsPanel } from "@/components/commerce/stock-corrections-panel";
import { StockRecordingValidationGuard } from "@/components/commerce/stock-recording-validation-guard";

function StockWorkspace({ businessId }: { businessId: string }) {
  return (
    <>
      <StockRecordingValidationGuard />
      <CommerceWorkspace businessId={businessId} view="inventory" />
      <StockCorrectionsPanel businessId={businessId} />
    </>
  );
}

export { StockWorkspace };
