import { MotionProvider } from "@absqir/ui/motion-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";

export interface ProvidersProps {
  children: ReactNode;
}

/** Wrap every island that fetches, animates, or keeps state in the URL. */
export function Providers(props: ProvidersProps) {
  return (
    <NuqsAdapter>
      <QueryClientProvider client={getQueryClient()}>
        <MotionProvider>{props.children}</MotionProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
