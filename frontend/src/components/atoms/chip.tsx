import { X } from "lucide-react";
import { joinClassNames } from "../class-names";

export interface ChipProps {
  label: string;
  isActive?: boolean;
  onRemove?: () => void;
}

export function Chip({ label, isActive = false, onRemove }: ChipProps) {
  return (
    <span
      className={joinClassNames(
        "inline-flex min-h-7.5 items-center gap-1 rounded-full py-1 text-footnote font-medium",
        onRemove ? "pr-1 pl-3" : "px-3",
        isActive
          ? "bg-label text-surface"
          : "bg-surface text-label shadow-[inset_0_0_0_1px_var(--separator)]",
      )}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${label}`}
          className="pressable -my-2 inline-flex size-11 items-center justify-center rounded-full text-label-2"
        >
          <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </span>
  );
}
