"use client";

import { ProgressiveStockWorkspace } from "@/components/commerce/stock/stock-progressive-workspace";

function StockRecorder({ businessId }: { businessId: string }) {
  return (
    <div className="stock-recorder-shell">
      <ProgressiveStockWorkspace businessId={businessId} />
      <style jsx global>{`
        @media (max-width: 1023px) {
          .stock-recorder-shell
            section:first-child:has(input[type="datetime-local"])
            aside {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
