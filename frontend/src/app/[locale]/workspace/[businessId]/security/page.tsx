import { BusinessSecurity } from "@/components/workspace/business-security";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <BusinessSecurity businessId={(await params).businessId} />;
}
