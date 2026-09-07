import { StockLedgerNavigation } from "@/components/commerce/stock/stock-ledger-navigation";
import { StockRecorderV2 } from "@/components/commerce/stock/stock-recorder-v2";
import { StockStatusCard } from "@/components/commerce/stock/stock-status-card";

function StockWorkspace({ businessId }: { businessId: string }) {
  return (
    <div className="stock-workspace-shell grid gap-4">
      <StockStatusCard businessId={businessId} />
      <StockRecorderV2 businessId={businessId} />
      <StockLedgerNavigation />
    </div>
  );
}

export { StockWorkspace };
