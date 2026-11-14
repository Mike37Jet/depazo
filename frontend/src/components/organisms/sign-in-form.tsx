import { type FormEvent, useId, useState } from "react";
import { Button } from "../atoms/button";
import { Input } from "../atoms/input";
import { StatusMessage } from "../molecules/status-message";

export type SignInStep = "email" | "code";

export interface SignInFormProps {
  step: SignInStep;
  email: string;
  isPending: boolean;
  errorMessage: string | null;
  onRequestCode: (email: string) => void;
  onVerifyCode: (code: string) => void;
  onChangeEmail: () => void;
  onSignInWithGoogle: () => void;
}

function buttonLabel(step: SignInStep, isPending: boolean): string {
  if (step === "email") {
    return isPending ? "Enviando código…" : "Enviarme un código";
  }
  return isPending ? "Entrando…" : "Entrar";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^\d{6,10}$/;

export function SignInForm({
  step,
  email,
  isPending,
  errorMessage,
  onRequestCode,
  onVerifyCode,
  onChangeEmail,
  onSignInWithGoogle,
}: SignInFormProps) {
  const fieldId = useId();
  const [draftEmail, setDraftEmail] = useState(email);
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "email") {
      const trimmed = draftEmail.trim();
      if (!EMAIL_PATTERN.test(trimmed)) {
        setFieldError("Escribe un email válido, por ejemplo nombre@correo.com.");
        return;
      }
      setFieldError(null);
      onRequestCode(trimmed);
      return;
    }
    const digits = code.replace(/\s/g, "");
    if (!CODE_PATTERN.test(digits)) {
      setFieldError("El código son solo números; revisa el email que te enviamos.");
      return;
    }
    setFieldError(null);
    onVerifyCode(digits);
  };

  const errorId = `${fieldId}-error`;
  const message = fieldError ?? errorMessage;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {step === "email" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-headline text-label">
            Email
          </label>
          <Input
            id={fieldId}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nombre@correo.com"
            value={draftEmail}
            isInvalid={Boolean(fieldError)}
            aria-describedby={fieldError ? errorId : undefined}
            onChange={(event) => setDraftEmail(event.currentTarget.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId} className="text-headline text-label">
            Código
          </label>
          <p className="text-subhead text-label-2">
            Te lo enviamos a <span className="font-semibold text-label">{email}</span>. Si no llega
            en un minuto, revisa la carpeta de spam.
          </p>
          <Input
            id={fieldId}
            autoComplete="one-time-code"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            isInvalid={Boolean(fieldError)}
            aria-describedby={fieldError ? errorId : undefined}
            onChange={(event) => setCode(event.currentTarget.value)}
            className="text-center text-title-3 tracking-widest tabular-nums"
          />
        </div>
      )}
      {message && (
        <div id={errorId}>
          <StatusMessage tone="error" message={message} />
        </div>
      )}
      <Button type="submit" isFullWidth disabled={isPending}>
        {buttonLabel(step, isPending)}
      </Button>
      {step === "code" ? (
        <Button variant="plain" onClick={onChangeEmail}>
          Usar otro email
        </Button>
      ) : (
        <Button variant="outlined" isFullWidth disabled={isPending} onClick={onSignInWithGoogle}>
          <img src="/google-logo.svg" alt="" aria-hidden="true" className="size-5" />
          Continuar con Google
        </Button>
      )}
    </form>
  );
}
