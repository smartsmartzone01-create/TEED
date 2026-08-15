import type { ReactNode } from "react";

function CommercePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="[&>section]:max-w-none [&>section]:px-2 sm:[&>section]:px-3 lg:[&>section]:px-4 [&_*]:shadow-none [&_.bg-slate-50]:bg-white [&_.bg-slate-100]:bg-white dark:[&_.bg-slate-50]:bg-slate-950 dark:[&_.bg-slate-100]:bg-slate-950">
      {children}
    </div>
  );
}

export { CommercePageShell };
