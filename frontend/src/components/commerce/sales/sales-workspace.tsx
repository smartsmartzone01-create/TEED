import { CommerceWorkspace } from "@/components/commerce/commerce-workspace";

function SalesWorkspace({ businessId }: { businessId: string }) {
  return <CommerceWorkspace businessId={businessId} view="sales" />;
}

export { SalesWorkspace };
