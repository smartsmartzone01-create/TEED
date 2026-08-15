import { CommerceWorkspace } from "@/components/commerce/legacy/commerce-workspace";

function SalesWorkspace({ businessId }: { businessId: string }) {
  return <CommerceWorkspace businessId={businessId} view="sales" />;
}

export { SalesWorkspace };
