import { Plus } from "lucide-react";
import { type KeyboardEvent, useId, useState } from "react";
import {
  filterPlaceOptions,
  findPlaceOption,
  normalizePlaceName,
  type PlaceOption,
} from "../../format/place-name";
import { Chip } from "../atoms/chip";
import { Input } from "../atoms/input";
import { joinClassNames } from "../class-names";

export interface TagInputProps {
  label: string;
  placeholder: string;
  values: string[];
  options?: PlaceOption[] | undefined;
  onChange: (values: string[]) => void;
}

const NO_ACTIVE_OPTION = -1;

export function TagInput({ label, placeholder, values, options, onChange }: TagInputProps) {
  const inputId = useId();
  const listboxId = useId();
  const errorId = useId();
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_OPTION);
  const [error, setError] = useState<string | null>(null);

  const isRestricted = options !== undefined && options.length > 0;
  const suggestions = isRestricted ? filterPlaceOptions(options, draft, values) : [];
  const isListVisible = isRestricted && isOpen && suggestions.length > 0;
  const hasNoMatch = isRestricted && isOpen && draft.trim() !== "" && suggestions.length === 0;
  const activeOption = isListVisible ? suggestions[activeIndex] : undefined;

  const add = (name: string) => {
    const isDuplicate = values.some(
      (existing) => normalizePlaceName(existing) === normalizePlaceName(name),
    );
    if (!isDuplicate) {
      onChange([...values, name]);
    }
    setDraft("");
    setError(null);
    setActiveIndex(NO_ACTIVE_OPTION);
  };

  const addDraft = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    if (!isRestricted) {
      add(text);
      return;
    }
    const chosen = activeOption ?? findPlaceOption(options, text);
    if (chosen) {
      add(chosen.name);
    } else {
      setError("Elige un sector de la lista.");
    }
  };

  const moveActive = (step: number) => {
    setIsOpen(true);
    setActiveIndex((current) =>
      Math.min(Math.max(current + step, NO_ACTIVE_OPTION), suggestions.length - 1),
    );
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraft();
    } else if (isRestricted && event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (isRestricted && event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(NO_ACTIVE_OPTION);
    }
  };

  const optionId = (index: number) => `${listboxId}-${index}`;

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <label htmlFor={inputId} className="text-body text-label">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          placeholder={placeholder}
          maxLength={120}
          autoComplete="off"
          isInvalid={error !== null}
          role={isRestricted ? "combobox" : undefined}
          aria-autocomplete={isRestricted ? "list" : undefined}
          aria-expanded={isRestricted ? isListVisible : undefined}
          aria-controls={isRestricted ? listboxId : undefined}
          aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setIsOpen(true);
            setError(null);
            setActiveIndex(NO_ACTIVE_OPTION);
          }}
          onKeyDown={handleKey}
        />
        <button
          type="button"
          onClick={addDraft}
          aria-label={`Agregar a ${label.toLowerCase()}`}
          className="pressable inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-2 text-accent"
        >
          <Plus aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </button>
      </div>
      {isListVisible && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`Sectores para ${label.toLowerCase()}`}
          className="inset-group overflow-hidden rounded-md bg-surface-2"
        >
          {suggestions.map((option, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input handles keyboard selection
            <div
              key={option.name}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(option.name)}
              className={joinClassNames(
                "flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-body text-label",
                index === activeIndex && "bg-glass-select",
              )}
            >
              <span>{option.name}</span>
              <span className="text-footnote text-label-2 tabular-nums">
                {option.listingCount} {option.listingCount === 1 ? "anuncio" : "anuncios"}
              </span>
            </div>
          ))}
        </div>
      )}
      {hasNoMatch && !error && (
        <p className="text-footnote text-label-2" aria-live="polite">
          No encontramos ese sector entre los anuncios. Prueba con otro nombre.
        </p>
      )}
      {error && (
        <p id={errorId} className="text-footnote text-danger" aria-live="polite">
          {error}
        </p>
      )}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} agregados`}>
          {values.map((value) => (
            <li key={value}>
              <Chip
                label={value}
                onRemove={() => onChange(values.filter((item) => item !== value))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
