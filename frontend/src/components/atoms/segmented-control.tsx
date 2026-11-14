import { joinClassNames } from "../class-names";

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
}

export interface SegmentedControlProps<Value extends string> {
  label: string;
  options: Array<SegmentOption<Value>>;
  value: Value;
  onChange: (value: Value) => void;
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <fieldset className="m-0 min-w-0 border-0 inline-grid auto-cols-fr grid-flow-col rounded-segment bg-surface-2 p-0.5">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={joinClassNames(
              "pressable min-h-11 rounded-segment-inner px-3.5 text-footnote font-medium text-label",
              isSelected && "bg-surface font-semibold shadow-segment",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
