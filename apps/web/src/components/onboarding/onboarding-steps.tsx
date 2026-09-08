import { cn } from "@absqir/ui/lib/utils";
import { CheckIcon } from "@phosphor-icons/react";

export type OnboardingStepName = "profile" | "avatar" | "organization" | "done";

const STEPS: { key: Exclude<OnboardingStepName, "done">; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "avatar", label: "Picture" },
  { key: "organization", label: "Organization" },
];

export interface OnboardingStepsProps {
  current: OnboardingStepName;
}

export function OnboardingSteps(props: OnboardingStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.key === props.current);
  const position = currentIndex === -1 ? STEPS.length : currentIndex;

  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="Onboarding steps">
      {STEPS.map((step, index) => {
        const done = index < position;
        const active = index === position;

        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <CheckIcon aria-hidden /> : index + 1}
            </span>
            <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="bg-border ml-1 h-px w-6" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
