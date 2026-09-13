import { useTranslate } from "@absqir/i18n/react";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { CheckIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";

export type OnboardingStepName = "profile" | "avatar" | "organization" | "done";

const STEPS: Exclude<OnboardingStepName, "done">[] = ["profile", "avatar", "organization"];

export interface OnboardingStepsProps {
  current: OnboardingStepName;
}

export function OnboardingSteps(props: OnboardingStepsProps) {
  const t = useTranslate();
  const currentIndex = STEPS.indexOf(props.current as (typeof STEPS)[number]);
  const position = match(currentIndex === -1)
    .with(true, () => STEPS.length)
    .otherwise(() => currentIndex);

  return (
    <ol className="flex items-center gap-3 text-sm" aria-label={t("onboarding:steps.label")}>
      {A.mapWithIndex(STEPS, (index, step) => {
        const done = index < position;
        const active = index === position;

        return (
          <li key={step} className="flex items-center gap-2">
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
              {t(`onboarding:steps.${step}`)}
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
