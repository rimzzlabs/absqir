// Installs the display zone before any island formats a date.
import "@/lib/timezone";
import type { Locale } from "@absqir/i18n";
import { I18nProvider } from "@absqir/i18n/react";
import { MotionProvider } from "@absqir/ui/motion-provider";
import { TooltipProvider } from "@absqir/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { ReactNode } from "react";
import { IslandBoundary } from "@/components/shared/island-boundary";
import { getQueryClient } from "@/lib/query-client";
import { useMotionPreference } from "@/lib/use-preferences";

export interface ProvidersProps {
  /**
   * The language this reader gets. It arrives as a prop, not from the
   * markup: the server renders every island too, and a language read off
   * `document` there would disagree with the one the browser hydrates with.
   */
  locale: Locale;
  children: ReactNode;
}

const REDUCED_MOTION = { system: "user", on: "never", off: "always" } as const;

/**
 * Wrap every island that fetches, animates, or keeps state in the URL. The
 * boundary sits inside the providers, so a fallback can still use them.
 *
 * Each island is its own React root, so context never crosses from one to the
 * next. Anything a second island needs belongs here, not in the shell.
 */
export function Providers(props: ProvidersProps) {
  const motion = useMotionPreference();

  return (
    <NuqsAdapter>
      <I18nProvider locale={props.locale}>
        <QueryClientProvider client={getQueryClient()}>
          <MotionProvider reducedMotion={REDUCED_MOTION[motion]}>
            <TooltipProvider>
              <IslandBoundary>{props.children}</IslandBoundary>
            </TooltipProvider>
          </MotionProvider>
        </QueryClientProvider>
      </I18nProvider>
    </NuqsAdapter>
  );
}
