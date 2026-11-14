import { type FormEvent, useEffect, useId, useState } from "react";
import type { PlaceOption } from "../../format/place-name";
import { describeScoreWeights } from "../../format/search-profile";
import type { SearchProfile, SearchProfileInput } from "../../services/api-client";
import { Button } from "../atoms/button";
import { Input } from "../atoms/input";
import { Switch } from "../atoms/switch";
import { FieldRow } from "../molecules/field-row";
import { InsetGroup } from "../molecules/inset-group";
import { StatusMessage } from "../molecules/status-message";
import { TagInput } from "../molecules/tag-input";
import {
  DEFAULT_WEIGHTS,
  type SearchProfileFormErrors,
  type SearchProfileFormValues,
  toFormValues,
  validateSearchProfile,
} from "./search-profile-form-model";

export interface SearchProfileFormProps {
  profile: SearchProfile | null;
  isSaving: boolean;
  status: { tone: "success" | "error"; message: string } | null;
  neighborhoodOptions?: PlaceOption[] | undefined;
  onSave: (input: SearchProfileInput) => void;
}

type TextField =
  | "maxMonthlyCost"
  | "minMonthlyCost"
  | "minBedrooms"
  | "maxBedrooms"
  | "minBathrooms"
  | "minArea"
  | "minScore";

export function SearchProfileForm({
  profile,
  isSaving,
  status,
  neighborhoodOptions,
  onSave,
}: SearchProfileFormProps) {
  const [values, setValues] = useState<SearchProfileFormValues>(() => toFormValues(profile));
  const [errors, setErrors] = useState<SearchProfileFormErrors>({});
  const formId = useId();
  const [isStatusVisible, setIsStatusVisible] = useState(false);

  const statusIdentity = status ? `${status.tone}:${status.message}` : null;

  useEffect(() => {
    setIsStatusVisible(statusIdentity !== null);
  }, [statusIdentity]);

  const update = <Field extends keyof SearchProfileFormValues>(
    field: Field,
    value: SearchProfileFormValues[Field],
  ) => {
    setIsStatusVisible(false);
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const outcome = validateSearchProfile(values, profile?.weights);
    if (!outcome.isValid) {
      setErrors(outcome.errors);
      return;
    }
    setErrors({});
    onSave(outcome.input);
  };

  const textField = (
    field: TextField,
    label: string,
    inputMode: "decimal" | "numeric",
    placeholder: string,
    hint?: string,
    isRequired = false,
  ) => {
    const inputId = `${formId}-${field}`;
    const errorId = `${inputId}-error`;
    return (
      <FieldRow
        label={label}
        htmlFor={inputId}
        error={errors[field]}
        errorId={errorId}
        isRequired={isRequired}
        {...(hint ? { hint } : {})}
      >
        <Input
          id={inputId}
          inputMode={inputMode}
          placeholder={placeholder}
          required={isRequired}
          value={values[field]}
          isInvalid={Boolean(errors[field])}
          aria-describedby={errors[field] ? errorId : undefined}
          onChange={(event) => update(field, event.currentTarget.value)}
          className="text-right tabular-nums"
        />
      </FieldRow>
    );
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <InsetGroup
        title="Presupuesto"
        footer="* Obligatorio. La alícuota son los gastos de condominio."
      >
        {textField("maxMonthlyCost", "Máximo al mes (USD)", "decimal", "900", undefined, true)}
        {textField("minMonthlyCost", "Mínimo al mes (USD)", "decimal", "Opcional")}
        <FieldRow label="Incluir alícuota" labelId={`${formId}-condo-label`}>
          <div className="flex justify-end">
            <Switch
              isChecked={values.isCondoFeeInBudget}
              onCheckedChange={(isChecked) => update("isCondoFeeInBudget", isChecked)}
              labelledBy={`${formId}-condo-label`}
            />
          </div>
        </FieldRow>
      </InsetGroup>

      <InsetGroup title="Espacio">
        {textField("minBedrooms", "Habitaciones mínimas", "numeric", "Opcional")}
        {textField("maxBedrooms", "Habitaciones máximas", "numeric", "Opcional")}
        {textField("minBathrooms", "Baños mínimos", "numeric", "Opcional")}
        {textField("minArea", "Área mínima (m²)", "decimal", "Opcional")}
      </InsetGroup>

      <InsetGroup
        title="Sectores"
        footer="Elige sectores de la lista, que sale de los anuncios reales. Los preferidos suben el puntaje; los excluidos se descartan."
      >
        <TagInput
          label="Preferidos"
          placeholder="Busca un sector, ej. La Carolina"
          values={values.preferredNeighborhoods}
          options={neighborhoodOptions}
          onChange={(names) => update("preferredNeighborhoods", names)}
        />
        <TagInput
          label="Excluidos"
          placeholder="Busca un sector, ej. Carcelén"
          values={values.excludedNeighborhoods}
          options={neighborhoodOptions}
          onChange={(names) => update("excludedNeighborhoods", names)}
        />
        {errors.excludedNeighborhoods && (
          <p className="px-4 py-2 text-footnote text-danger">{errors.excludedNeighborhoods}</p>
        )}
      </InsetGroup>

      <InsetGroup title="Puntaje">
        {textField(
          "minScore",
          "Puntaje mínimo",
          "numeric",
          "60",
          `De 0 a 100, mide qué tan bien encaja cada anuncio según ${describeScoreWeights(profile?.weights ?? DEFAULT_WEIGHTS)}. Solo verás y te avisaremos de los que lleguen a este mínimo; si no ves resultados, bájalo.`,
        )}
      </InsetGroup>

      {status && isStatusVisible && <StatusMessage tone={status.tone} message={status.message} />}

      <Button type="submit" isFullWidth disabled={isSaving}>
        {isSaving ? "Guardando…" : "Guardar búsqueda"}
      </Button>
    </form>
  );
}
