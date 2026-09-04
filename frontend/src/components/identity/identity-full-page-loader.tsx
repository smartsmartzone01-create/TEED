import { BrandLoader } from "@/components/global/brand/brand-loader";

type IdentityFullPageLoaderProps = {
  message: string;
};

function IdentityFullPageLoader({ message }: IdentityFullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <BrandLoader label={message} />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

export { IdentityFullPageLoader };
