import { cn } from "@absqir/ui/lib/utils";
import { Spinner } from "@absqir/ui/spinner";
import { A } from "@mobily/ts-belt";
import { VideoCameraSlashIcon } from "@phosphor-icons/react";
import type { RefObject } from "react";
import { match, P } from "ts-pattern";

export interface ScanViewfinderProps {
  video: RefObject<HTMLVideoElement | null>;
  /** The camera has a picture. */
  active: boolean;
  /** Why the camera did not open. Null while it can still open. */
  error: string | null;
  /** A code is on its way to the server. */
  busy: boolean;
}

const CORNERS = [
  "top-0 left-0 rounded-tl-md border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-md border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-md border-b-2 border-l-2",
  "bottom-0 right-0 rounded-br-md border-b-2 border-r-2",
];

/** The square the reader aims with: the picture, the frame, and its state. */
export function ScanViewfinder(props: ScanViewfinderProps) {
  const framed = props.active && !props.busy;

  return (
    <div className="bg-muted ring-foreground/10 relative aspect-square w-full overflow-hidden rounded-2xl ring-1">
      <video ref={props.video} muted playsInline className="size-full object-cover" />

      {match(props.active)
        .with(true, () => (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {/* The ring darkens the picture outside the frame, and the parent clips it. */}
            <div className="absolute inset-[14%] overflow-hidden shadow-[0_0_0_100vmax_rgba(0,0,0,0.45)]">
              {match(framed)
                .with(true, () => (
                  <span className="scan-sweep absolute inset-0">
                    <span className="block h-px w-full bg-white/80 shadow-[0_0_10px_2px_rgba(255,255,255,0.45)]" />
                  </span>
                ))
                .otherwise(() => null)}
              {A.map(CORNERS, (corner) => (
                <span
                  key={corner}
                  className={cn("absolute size-7 border-white/90 sm:size-9", corner)}
                />
              ))}
            </div>
          </div>
        ))
        .otherwise(() => null)}

      {match(framed)
        .with(true, () => (
          <p className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Looking for a code
          </p>
        ))
        .otherwise(() => null)}

      {match(!props.active && !props.error)
        .with(true, () => (
          <p className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
            <Spinner className="size-5" />
            Opening the camera…
          </p>
        ))
        .otherwise(() => null)}

      {match(props.error)
        .with(P.string.minLength(1), (error) => (
          <p className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm">
            <VideoCameraSlashIcon aria-hidden className="size-8" />
            {error}
          </p>
        ))
        .otherwise(() => null)}

      {match(props.busy)
        .with(true, () => (
          <p
            role="status"
            className="bg-background/75 absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium backdrop-blur-sm"
          >
            <Spinner className="size-5" />
            Checking you in…
          </p>
        ))
        .otherwise(() => null)}
    </div>
  );
}
