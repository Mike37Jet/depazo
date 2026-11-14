import type { ButtonHTMLAttributes } from "react";
import { joinClassNames } from "../class-names";

export type ButtonVariant = "primary" | "secondary" | "plain" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent-fill text-on-accent",
  secondary: "bg-surface-2 text-accent",
  plain: "bg-transparent text-accent",
  destructive: "bg-transparent text-danger",
};

export const BUTTON_BASE_CLASSES =
  "pressable inline-flex min-h-12.5 items-center justify-center gap-2 rounded-full px-5 text-body font-semibold";

export function buttonClasses(variant: ButtonVariant = "primary", isFullWidth = false): string {
  return joinClassNames(BUTTON_BASE_CLASSES, VARIANT_CLASSES[variant], isFullWidth && "w-full");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isFullWidth?: boolean;
}

export function Button({
  variant = "primary",
  isFullWidth = false,
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={joinClassNames(
        buttonClasses(variant, isFullWidth),
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
