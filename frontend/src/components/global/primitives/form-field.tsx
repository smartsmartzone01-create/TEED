import type { ReactNode } from "react";

import { cn } from "@/lib/global/class-names";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: string;
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
};

function FormField({
  children,
  className,
  description,
  error,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  const descriptionId = description
    ? htmlFor + "-description"
    : undefined;
  const errorId = error ? htmlFor + "-error" : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <label
        className="text-sm font-medium text-foreground"
        htmlFor={htmlFor}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </label>

      {children}

      {description && !error ? (
        <p
          className="text-xs leading-5 text-muted-foreground"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          className="text-xs font-medium leading-5 text-red-700 dark:text-red-400"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
export type { FormFieldProps };
