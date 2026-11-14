import { useEffect, useRef } from "react";

export interface RangeSliderProps {
  id?: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

const PERCENT = 100;

export function RangeSlider({
  id,
  label,
  value,
  min = 0,
  max = PERCENT,
  onChange,
}: RangeSliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const filled = ((value - min) / (max - min)) * PERCENT;
    inputRef.current?.style.setProperty("--val", `${filled}%`);
  }, [value, min, max]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="range"
      className="range"
      aria-label={label}
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.currentTarget.value))}
    />
  );
}
