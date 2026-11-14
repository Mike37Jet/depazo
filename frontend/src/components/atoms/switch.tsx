import { joinClassNames } from "../class-names";

export interface SwitchProps {
  id?: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
  labelledBy?: string;
}

export function Switch({ id, isChecked, onCheckedChange, labelledBy }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-labelledby={labelledBy}
      onClick={() => onCheckedChange(!isChecked)}
      className={joinClassNames(
        "group relative h-7.75 w-12.75 shrink-0 rounded-full",
        "transition-colors duration-snappy ease-spring",
        isChecked ? "bg-score-high" : "bg-surface-2 shadow-[inset_0_0_0_1px_var(--separator)]",
      )}
    >
      <span
        className={joinClassNames(
          "absolute top-0.5 left-0.5 h-6.75 w-6.75 rounded-full bg-on-media shadow-[0_2px_6px_rgba(0,0,0,0.2)]",
          "transition-[transform,width] duration-snappy ease-spring group-active:w-8.25",
          isChecked && "translate-x-5 group-active:translate-x-3.5",
        )}
      />
    </button>
  );
}
