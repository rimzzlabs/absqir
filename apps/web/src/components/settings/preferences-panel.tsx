import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Label } from "@absqir/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import {
  type MotionPreference,
  setMotion,
  setTheme,
  type ThemePreference,
} from "@/lib/preferences";
import { useMotionPreference, useThemePreference } from "@/lib/use-preferences";

const THEMES: { value: ThemePreference; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "System", icon: DesktopIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

const MOTIONS: { value: MotionPreference; label: string }[] = [
  { value: "system", label: "Follow the device" },
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

/** Choices that belong to this browser, not to the account. */
export function PreferencesPanel() {
  const theme = useThemePreference();
  const motion = useMotionPreference();

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Kept in this browser. A phone and a room screen can differ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label id="theme-label">Theme</Label>
            <ToggleGroup
              aria-labelledby="theme-label"
              value={[theme]}
              onValueChange={(value) => {
                const next = value[0] as ThemePreference | undefined;
                if (next) setTheme(next);
              }}
              variant="outline"
            >
              {THEMES.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  <option.icon />
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">System follows the device setting.</p>
          </div>

          <div className="space-y-2">
            <Label id="motion-label">Animation</Label>
            <ToggleGroup
              aria-labelledby="motion-label"
              value={[motion]}
              onValueChange={(value) => {
                const next = value[0] as MotionPreference | undefined;
                if (next) setMotion(next);
              }}
              variant="outline"
            >
              {MOTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">
              Off stops every transition, popup and page motion. Follow the device respects the
              reduce motion setting of the operating system.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
