import type { ReactNode } from "react";
import { joinClassNames } from "../class-names";

export type GlassVariant = "regular" | "clear";
export type GlassShape = "capsule" | "circle";

export interface GlassSurfaceProps {
  variant?: GlassVariant;
  shape?: GlassShape;
  className?: string;
  children: ReactNode;
}

export const GLASS_BUTTON_CLASSES =
  "pressable inline-grid size-11 place-items-center rounded-full text-inherit [&_svg]:size-5 [&_svg]:stroke-2";

export function GlassSurface({
  variant = "regular",
  shape = "capsule",
  className,
  children,
}: GlassSurfaceProps) {
  return (
    <div
      className={joinClassNames(
        "glass",
        variant === "regular" ? "glass-regular" : "glass-clear",
        shape === "capsule"
          ? "inline-flex min-h-11 items-center rounded-full px-1"
          : "grid size-11 place-items-center rounded-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
