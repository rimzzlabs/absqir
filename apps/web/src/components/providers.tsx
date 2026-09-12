// Installs the display zone before any island formats a date.
import "@/lib/timezone";
import { MotionProvider } from "@absqir/ui/motion-provider";
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
 */
export function Providers(props: ProvidersProps) {
  const motion = useMotionPreference();

  return (
    <NuqsAdapter>
      <QueryClientProvider client={getQueryClient()}>
        <MotionProvider reducedMotion={REDUCED_MOTION[motion]}>
          <IslandBoundary>{props.children}</IslandBoundary>
        </MotionProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
