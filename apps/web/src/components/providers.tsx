// Installs the display zone before any island formats a date.
import "@/lib/timezone";
import { MotionProvider } from "@absqir/ui/motion-provider";
import { TooltipProvider } from "@absqir/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { ReactNode } from "react";
import { IslandBoundary } from "@/components/shared/island-boundary";
import { getQueryClient } from "@/lib/query-client";
import { useMotionPreference } from "@/lib/use-preferences";

export interface ProvidersProps {
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
      <QueryClientProvider client={getQueryClient()}>
        <MotionProvider reducedMotion={REDUCED_MOTION[motion]}>
          <TooltipProvider>
            <IslandBoundary>{props.children}</IslandBoundary>
          </TooltipProvider>
        </MotionProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
