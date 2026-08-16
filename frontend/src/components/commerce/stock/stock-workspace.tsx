import { StockRecorder } from "@/components/commerce/stock/stock-recorder";

function StockWorkspace({ businessId }: { businessId: string }) {
  return <StockRecorder businessId={businessId} />;
}

export { StockWorkspace };
