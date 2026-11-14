import type { InputHTMLAttributes } from "react";
import { joinClassNames } from "../class-names";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  isInvalid?: boolean;
}

export function Input({ isInvalid = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={isInvalid || undefined}
      className={joinClassNames(
        "min-h-11 w-full rounded-md border border-label-3 bg-surface px-3 text-body text-label",
        "placeholder:text-label-3",
        isInvalid && "ring-2 ring-danger",
        className,
      )}
      {...props}
    />
  );
}
