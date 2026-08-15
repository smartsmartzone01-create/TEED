import { CommerceWorkspace } from "@/components/commerce/legacy/commerce-workspace";

function ExpensesWorkspace({ businessId }: { businessId: string }) {
  return <CommerceWorkspace businessId={businessId} view="expenses" />;
}

export { ExpensesWorkspace };
