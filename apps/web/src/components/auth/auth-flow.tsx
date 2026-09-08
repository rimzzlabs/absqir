import { useState } from "react";
import { match } from "ts-pattern";
import { AuthClosed } from "@/components/auth/auth-closed";
import { AuthCodeStep } from "@/components/auth/auth-code-step";
import { AuthEmailStep } from "@/components/auth/auth-email-step";
import { AuthPasswordStep } from "@/components/auth/auth-password-step";
import { AuthResetStep } from "@/components/auth/auth-reset-step";
import { Providers } from "@/components/providers";

export interface AuthFlowProps {
  /** Where to land after a successful sign in. */
  next: string;
  /** Prefilled when the reader arrived from an invitation. */
  initialEmail?: string;
  /** The open event whose public page sent the reader here. */
  eventId?: string | null;
}

/**
 * The single door. One email field first; what follows depends on whether the
 * email is known: a password, a code that creates the account, or a note that
 * the email needs an invitation.
 */
type Step =
  | { kind: "email" }
  | { kind: "password"; email: string; password: string }
  | { kind: "code"; email: string; isNew: boolean }
  | { kind: "reset"; email: string }
  | { kind: "closed"; email: string };

function AuthSteps(props: AuthFlowProps) {
  const [step, setStep] = useState<Step>({ kind: "email" });

  return match(step)
    .with({ kind: "email" }, () => (
      <AuthEmailStep
        initialEmail={props.initialEmail ?? ""}
        eventId={props.eventId ?? null}
        onKnownWithPassword={(email, password) => setStep({ kind: "password", email, password })}
        onCodeSent={(email, isNew) => setStep({ kind: "code", email, isNew })}
        onClosed={(email) => setStep({ kind: "closed", email })}
      />
    ))
    .with({ kind: "password" }, ({ email, password }) => (
      <AuthPasswordStep
        email={email}
        initialPassword={password}
        next={props.next}
        onBack={() => setStep({ kind: "email" })}
        onCodeSent={() => setStep({ kind: "reset", email })}
      />
    ))
    .with({ kind: "code" }, ({ email, isNew }) => (
      <AuthCodeStep
        email={email}
        isNew={isNew}
        next={props.next}
        onBack={() => setStep({ kind: "email" })}
      />
    ))
    .with({ kind: "reset" }, ({ email }) => (
      <AuthResetStep
        email={email}
        next={props.next}
        onBack={() => setStep({ kind: "password", email, password: "" })}
      />
    ))
    .with({ kind: "closed" }, ({ email }) => (
      <AuthClosed email={email} onBack={() => setStep({ kind: "email" })} />
    ))
    .exhaustive();
}

export function AuthFlow(props: AuthFlowProps) {
  return (
    <Providers>
      <AuthSteps {...props} />
    </Providers>
  );
}
