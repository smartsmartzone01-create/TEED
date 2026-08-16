import { CommerceWorkspace } from "@/components/commerce/legacy/commerce-workspace";
import { StockBuyingPriceModePanel } from "@/components/commerce/stock/stock-buying-price-mode-panel";
import { StockCorrectionsPanel } from "@/components/commerce/stock/stock-corrections-panel";
import { StockRecordingValidationGuard } from "@/components/commerce/stock/stock-recording-validation-guard";
import { StockSummaryActionsPanel } from "@/components/commerce/stock/stock-summary-actions-panel";

function StockWorkspace({ businessId }: { businessId: string }) {
  return (
    <>
      <StockRecordingValidationGuard />
      <StockBuyingPriceModePanel />
      <CommerceWorkspace businessId={businessId} view="inventory" />
      <StockCorrectionsPanel businessId={businessId} />
      <StockSummaryActionsPanel businessId={businessId} />
    </>
  );
}

export { StockWorkspace };
