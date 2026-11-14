import type { ReactNode } from "react";

export interface FieldRowProps {
  label: string;
  htmlFor?: string;
  labelId?: string;
  hint?: string;
  error?: string | undefined;
  errorId?: string;
  isStacked?: boolean;
  isRequired?: boolean;
  children: ReactNode;
}

export function FieldRow({
  label,
  htmlFor,
  labelId,
  hint,
  error,
  errorId,
  isStacked = false,
  isRequired = false,
  children,
}: FieldRowProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-1.5">
      <div
        className={
          isStacked ? "flex flex-col gap-2" : "flex min-h-11 items-center justify-between gap-4"
        }
      >
        <div className="min-w-0 flex-1 text-body text-label">
          <label id={labelId} htmlFor={htmlFor}>
            {label}
          </label>
          {isRequired && (
            <span aria-hidden="true" className="text-danger">
              {"\u00a0*"}
            </span>
          )}
        </div>
        <div className={isStacked ? "w-full" : "w-24 shrink-0"}>{children}</div>
      </div>
      {hint && !error && <p className="text-footnote text-label-2">{hint}</p>}
      {error && (
        <p id={errorId} className="text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
