import { Field, FieldLabel, FieldTitle } from "@absqir/ui/field";
import { cn } from "@absqir/ui/lib/utils";
import { RadioGroup, RadioGroupItem } from "@absqir/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { A } from "@mobily/ts-belt";
import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import {
  type MotionPreference,
  setMotion,
  setTheme,
  type ThemePreference,
} from "@/lib/preferences";
import { useMotionPreference, useThemePreference } from "@/lib/use-preferences";

const THEMES: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Follows the device" },
  { value: "light", label: "Light", hint: "Always" },
  { value: "dark", label: "Dark", hint: "Always" },
];

const MOTIONS: { value: MotionPreference; label: string }[] = [
  { value: "system", label: "Follow the device" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

/** One tiny app frame, in one scheme: a sidebar, a header, a few lines. */
function Pane(props: { dark: boolean; className?: string }) {
  const { dark } = props;

  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 flex",
        dark ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900",
        props.className,
      )}
    >
      <div
        className={cn(
          "flex w-[28%] flex-col gap-1 border-r p-1.5",
          dark ? "border-white/10 bg-neutral-800" : "border-neutral-200 bg-neutral-50",
        )}
      >
        <span className="bg-primary h-1.5 w-1/2 rounded-full" />
        <span className={cn("h-1 rounded-full", dark ? "bg-neutral-600" : "bg-neutral-300")} />
        <span
          className={cn("h-1 w-4/5 rounded-full", dark ? "bg-neutral-700" : "bg-neutral-200")}
        />
        <span
          className={cn("h-1 w-3/5 rounded-full", dark ? "bg-neutral-700" : "bg-neutral-200")}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <span
          className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-neutral-500" : "bg-neutral-400")}
        />
        <span
          className={cn("h-1 w-4/5 rounded-full", dark ? "bg-neutral-700" : "bg-neutral-200")}
        />
        <span
          className={cn("h-1 w-2/3 rounded-full", dark ? "bg-neutral-700" : "bg-neutral-200")}
        />
        <span className="bg-primary mt-auto h-2.5 w-7 rounded-sm" />
      </div>
    </div>
  );
}

function Preview(props: { theme: ThemePreference }) {
  return (
    <div className="border-border relative aspect-[16/10] w-full overflow-hidden rounded-md border">
      {props.theme === "system" ? (
        <>
          <Pane dark={false} />
          <Pane dark className="[clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        </>
      ) : (
        <Pane dark={props.theme === "dark"} />
      )}
    </div>
  );
}

function isTheme(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/** Choices that belong to this browser, not to the account. */
export function PreferencesPanel() {
  const theme = useThemePreference();
  const motion = useMotionPreference();

  return (
    <SettingsSection
      title="Preferences"
      description="Kept in this browser, not on the account. A phone and a room screen can differ."
    >
      <SettingsRow label="Theme" hint="System follows the device setting and changes with it.">
        <RadioGroup
          aria-label="Theme"
          value={theme}
          onValueChange={(value) => {
            if (isTheme(value)) setTheme(value);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {A.map(THEMES, (option) => (
            <FieldLabel key={option.value} htmlFor={`theme-${option.value}`}>
              <Field className="gap-3">
                <Preview theme={option.value} />
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <FieldTitle>{option.label}</FieldTitle>
                    <p className="text-muted-foreground text-xs">{option.hint}</p>
                  </div>
                  <RadioGroupItem id={`theme-${option.value}`} value={option.value} />
                </div>
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </SettingsRow>

      <SettingsRow
        label="Animation"
        hint="Off stops every transition, popup and page motion. Follow the device respects the reduce motion setting of the operating system."
      >
        <ToggleGroup
          aria-label="Animation"
          value={[motion]}
          onValueChange={(value) => {
            const next = value[0] as MotionPreference | undefined;
            if (next) setMotion(next);
          }}
          variant="outline"
        >
          {A.map(MOTIONS, (option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingsRow>
    </SettingsSection>
  );
}
