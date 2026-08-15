import { CommerceWorkspace } from "@/components/commerce/legacy/commerce-workspace";

function ReturnsWorkspace({ businessId }: { businessId: string }) {
  return <CommerceWorkspace businessId={businessId} view="returns" />;
}

export { ReturnsWorkspace };
