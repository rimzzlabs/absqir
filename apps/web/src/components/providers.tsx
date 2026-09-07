import { MotionProvider } from "@absqir/ui/motion-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "@/lib/query-client";

export interface ProvidersProps {
  children: ReactNode;
}

/** Wrap every island that fetches or animates. */
export function Providers(props: ProvidersProps) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <MotionProvider>{props.children}</MotionProvider>
    </QueryClientProvider>
  );
}
