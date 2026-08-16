"use client";

import { ProgressiveStockWorkspace } from "@/components/commerce/stock/stock-progressive-workspace";

function StockRecorder({ businessId }: { businessId: string }) {
  return (
    <div className="stock-recorder-shell">
      <ProgressiveStockWorkspace businessId={businessId} />
      <style jsx global>{`
        /* Let the progressive Stock card end where its active content ends. */
        .stock-recorder-shell
          > div
          > section:first-child
          > div.grid
          > div:last-child {
          min-height: 0 !important;
        }

        @media (max-width: 1023px) {
          .stock-recorder-shell
            section:first-child:has(input[type="datetime-local"])
            aside {
            display: none;
          }
        }

        /*
         * Late-delivery cancel belongs to the page flow, directly after the
         * recorder. Do not float or pin it to the viewport.
         */
        .stock-recorder-shell
          > div
          > section:nth-of-type(2)
          > div:first-child
          > button {
          position: static;
          inset: auto;
          z-index: auto;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
