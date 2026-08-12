import { BusinessProfileEditor } from "@/components/workspace/business-profile-editor";

export default async function Page({ params }: { params: Promise<{ businessId: string }> }) {
  return <BusinessProfileEditor businessId={(await params).businessId} section="operations" />;
}
