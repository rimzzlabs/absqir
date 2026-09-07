import { Button } from "@absqir/ui/button";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

export function ThemeToggle() {
  const onToggle = () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the theme still switches for this page.
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      onClick={onToggle}
    >
      <SunIcon className="hidden dark:block" aria-hidden="true" />
      <MoonIcon className="dark:hidden" aria-hidden="true" />
    </Button>
  );
}
