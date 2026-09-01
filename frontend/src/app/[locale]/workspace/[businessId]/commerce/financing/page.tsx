import { FinancingWorkspace } from "@/components/commerce/financing/financing-workspace";
import { CommercePageShell } from "@/components/commerce/shared/commerce-page-shell";

import styles from "./financing-page.module.css";

export default async function Page({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  return (
    <CommercePageShell>
      <div className={styles.page}>
        <FinancingWorkspace businessId={(await params).businessId} />
      </div>
    </CommercePageShell>
  );
}
