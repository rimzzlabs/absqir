import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { CheckIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";

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
  const position = match(currentIndex === -1)
    .with(true, () => STEPS.length)
    .otherwise(() => currentIndex);

  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="Onboarding steps">
      {A.mapWithIndex(STEPS, (index, step) => {
        const done = index < position;
        const active = index === position;

        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              aria-current={match(active)
                .with(true, () => "step" as const)
                .otherwise(() => undefined)}
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {match(done)
                .with(true, () => <CheckIcon aria-hidden />)
                .otherwise(() => index + 1)}
            </span>
            <span
              className={cn(
                match(active)
                  .with(true, () => "text-foreground" as const)
                  .otherwise(() => "text-muted-foreground" as const),
              )}
            >
              {step.label}
            </span>
            {match(index < STEPS.length - 1)
              .with(true, () => <span aria-hidden className="bg-border ml-1 h-px w-6" />)
              .otherwise(() => null)}
          </li>
        );
      })}
    </ol>
  );
}
