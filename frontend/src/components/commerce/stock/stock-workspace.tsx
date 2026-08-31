import { StockLedgerNavigation } from "@/components/commerce/stock/stock-ledger-navigation";
import { StockRecorder } from "@/components/commerce/stock/stock-recorder";

function StockWorkspace({ businessId }: { businessId: string }) {
  return (
    <div className="stock-workspace-shell">
      <StockRecorder businessId={businessId} />
      <StockLedgerNavigation />
    </div>
  );
}

export { StockWorkspace };
