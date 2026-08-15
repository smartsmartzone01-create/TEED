import { CommerceWorkspace } from "@/components/commerce/legacy/commerce-workspace";

function BudgetsWorkspace({ businessId }: { businessId: string }) {
  return <CommerceWorkspace businessId={businessId} view="budgets" />;
}

export { BudgetsWorkspace };
