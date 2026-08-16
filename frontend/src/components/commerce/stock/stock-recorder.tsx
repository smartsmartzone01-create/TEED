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

        /*
         * The received-stock header only renders this button while a late-delivery
         * workflow is active. Keep that same cancel action persistently reachable
         * throughout every progressive recording step so the whole workflow can
         * be abandoned without scrolling back to the received-stock list.
         */
        .stock-recorder-shell
          > div
          > section:nth-of-type(2)
          > div:first-child
          > button {
          position: fixed;
          right: 1rem;
          bottom: 1rem;
          z-index: 60;
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
          background: var(--background, white);
        }

        @media (max-width: 639px) {
          .stock-recorder-shell
            > div
            > section:nth-of-type(2)
            > div:first-child
            > button {
            right: 1rem;
            left: 1rem;
            width: calc(100% - 2rem);
          }
        }
      `}</style>
    </div>
  );
}

export { StockRecorder };
