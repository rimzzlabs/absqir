import { useTranslate } from "@absqir/i18n/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { A } from "@mobily/ts-belt";
import { ListNumbersIcon } from "@phosphor-icons/react";

const STEPS = ["one", "two", "three"] as const;

/** Three lines that answer the first-timer, and fill the rail with sense. */
export function CheckInSteps() {
  const t = useTranslate();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListNumbersIcon />
          {t("checkin:steps.title")}
        </CardTitle>
        <CardDescription>{t("checkin:steps.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {A.mapWithIndex(STEPS, (index, step) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden
                className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug font-medium">{t(`checkin:steps.${step}`)}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t(`checkin:steps.${step}Hint`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
