import { useState } from "react";
import { SignInForm, type SignInStep } from "../components/organisms/sign-in-form";
import { useRequestSignInCode, useVerifySignInCode } from "../hooks/use-sign-in";

export function SignInPage() {
  const [step, setStep] = useState<SignInStep>("email");
  const [email, setEmail] = useState("");
  const requestCode = useRequestSignInCode();
  const verifyCode = useVerifySignInCode();

  const errorMessage = requestCode.isError
    ? "No pudimos enviarte el código. Revisa tu email o espera un minuto e inténtalo de nuevo."
    : verifyCode.isError
      ? "El código no es válido o ya venció. Pide uno nuevo si hace falta."
      : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-large-title text-label">depazo</h1>
        <p className="text-body text-label-2">
          Departamentos en arriendo en Quito que encajan con lo que buscas.
        </p>
      </header>
      <SignInForm
        key={step}
        step={step}
        email={email}
        isPending={requestCode.isPending || verifyCode.isPending}
        errorMessage={errorMessage}
        onRequestCode={(address) =>
          requestCode.mutate(address, {
            onSuccess: () => {
              setEmail(address);
              verifyCode.reset();
              setStep("code");
            },
          })
        }
        onVerifyCode={(code) => verifyCode.mutate({ email, code })}
        onChangeEmail={() => {
          requestCode.reset();
          verifyCode.reset();
          setStep("email");
        }}
      />
    </main>
  );
}
