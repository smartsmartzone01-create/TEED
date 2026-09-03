import { StockLedgerNavigation } from "@/components/commerce/stock/stock-ledger-navigation";
import { StockRecorder } from "@/components/commerce/stock/stock-recorder";
import { StockStatusCard } from "@/components/commerce/stock/stock-status-card";

function StockWorkspace({ businessId }: { businessId: string }) {
  return (
    <div className="stock-workspace-shell grid gap-4">
      <StockStatusCard businessId={businessId} />
      <StockRecorder businessId={businessId} />
      <StockLedgerNavigation />
    </div>
  );
}

export { StockWorkspace };
