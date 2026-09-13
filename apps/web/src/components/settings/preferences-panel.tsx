import { useTranslate } from "@absqir/i18n/react";
import { Field, FieldLabel, FieldTitle } from "@absqir/ui/field";
import { cn } from "@absqir/ui/lib/utils";
import { RadioGroup, RadioGroupItem } from "@absqir/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import {
  type MotionPreference,
  setMotion,
  setTheme,
  type ThemePreference,
} from "@/lib/preferences";
import { useMotionPreference, useThemePreference } from "@/lib/use-preferences";

const THEMES: ThemePreference[] = ["system", "light", "dark"];

const MOTIONS: MotionPreference[] = ["system", "on", "off"];

/** One tiny app frame, in one scheme: a sidebar, a header, a few lines. */
function Pane(props: { dark: boolean; className?: string }) {
  const { dark } = props;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 flex",
        match(dark)
          .with(true, () => "bg-neutral-900 text-neutral-100" as const)
          .otherwise(() => "bg-white text-neutral-900" as const),
        props.className,
      )}
    >
      <div
        className={cn(
          "flex w-[28%] flex-col gap-1 border-r p-1.5",
          match(dark)
            .with(true, () => "border-white/10 bg-neutral-800" as const)
            .otherwise(() => "border-neutral-200 bg-neutral-50" as const),
        )}
      >
        <span className="bg-primary h-1.5 w-1/2 rounded-full" />
        <span
          className={cn(
            "h-1 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-600" as const)
              .otherwise(() => "bg-neutral-300" as const),
          )}
        />
        <span
          className={cn(
            "h-1 w-4/5 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-700" as const)
              .otherwise(() => "bg-neutral-200" as const),
          )}
        />
        <span
          className={cn(
            "h-1 w-3/5 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-700" as const)
              .otherwise(() => "bg-neutral-200" as const),
          )}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <span
          className={cn(
            "h-1.5 w-1/2 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-500" as const)
              .otherwise(() => "bg-neutral-400" as const),
          )}
        />
        <span
          className={cn(
            "h-1 w-4/5 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-700" as const)
              .otherwise(() => "bg-neutral-200" as const),
          )}
        />
        <span
          className={cn(
            "h-1 w-2/3 rounded-full",
            match(dark)
              .with(true, () => "bg-neutral-700" as const)
              .otherwise(() => "bg-neutral-200" as const),
          )}
        />
        <span className="bg-primary mt-auto h-2.5 w-7 rounded-sm" />
      </div>
    </div>
  );
}

function Preview(props: { theme: ThemePreference }) {
  return (
    <div className="border-border relative aspect-[16/10] w-full overflow-hidden rounded-md border">
      {match(props.theme)
        .with("system", () => (
          <>
            <Pane dark={false} />
            <Pane dark className="[clip-path:polygon(100%_0,100%_100%,0_100%)]" />
          </>
        ))
        .otherwise((theme) => (
          <Pane dark={theme === "dark"} />
        ))}
    </div>
  );
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/** Choices that belong to this browser, not to the account. */
export function PreferencesPanel() {
  const t = useTranslate();
  const theme = useThemePreference();
  const motion = useMotionPreference();

  return (
    <SettingsSection
      title={t("settings:preferences.title")}
      description={t("settings:preferences.description")}
    >
      <SettingsRow
        label={t("settings:preferences.theme")}
        hint={t("settings:preferences.themeHint")}
      >
        <RadioGroup
          aria-label={t("settings:preferences.theme")}
          value={theme}
          onValueChange={(value) => {
            if (isTheme(value)) setTheme(value);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {A.map(THEMES, (option) => (
            <FieldLabel key={option} htmlFor={`theme-${option}`}>
              <Field className="gap-3">
                <Preview theme={option} />
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <FieldTitle>{t(`settings:preferences.themes.${option}`)}</FieldTitle>
                    <p className="text-muted-foreground text-xs">
                      {t(`settings:preferences.themes.${option}Hint`)}
                    </p>
                  </div>
                  <RadioGroupItem id={`theme-${option}`} value={option} />
                </div>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </SettingsRow>

      <SettingsRow
        label={t("settings:preferences.animation")}
        hint={t("settings:preferences.animationHint")}
      >
        <ToggleGroup
          aria-label={t("settings:preferences.animation")}
          value={[motion]}
          onValueChange={(value) => {
            const next = value[0] as MotionPreference | undefined;
            if (next) setMotion(next);
          }}
          variant="outline"
        >
          {A.map(MOTIONS, (option) => (
            <ToggleGroupItem key={option} value={option}>
              {t(`settings:preferences.motions.${option}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingsRow>
    </SettingsSection>
  );
}
