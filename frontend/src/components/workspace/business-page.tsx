import type { ReactNode } from "react";

type BusinessPageProps = {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
};

function BusinessPage({ children, description, eyebrow, title }: BusinessPageProps) {
  return (
    <div className="space-y-6">
      <header>
        {eyebrow ? <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      </header>
      {children}
    </div>
  );
}

export { BusinessPage };
