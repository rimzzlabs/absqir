import { Button } from "@absqir/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { cn } from "@absqir/ui/lib/utils";
import {
  ArrowClockwiseIcon,
  FadersHorizontalIcon,
  LockIcon,
  VideoCameraIcon,
} from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import type { CameraFault } from "@/components/shared/use-camera";

export interface CameraBlockedOverlayProps {
  /** Null while the camera works. Only a refusal opens the coach mark. */
  fault: CameraFault | null;
  /** Asks the browser for the camera again. */
  onRetry: () => void;
}

/** The button drawn the way the browser draws it, so the reader knows it on sight. */
function Mark(props: { children: ReactNode }) {
  return (
    <span className="bg-muted ring-foreground/10 mx-0.5 inline-flex size-5 translate-y-1 items-center justify-center rounded ring-1">
      {props.children}
    </span>
  );
}

interface Coach {
  /** The screen edge that holds the address bar, which the band marks. */
  side: "top" | "bottom";
  /** How to reach the site's own settings. */
  find: ReactNode;
  /** What to do once they are open. */
  allow: string;
}

const CHROMIUM: Coach = {
  side: "top",
  find: (
    <>
      Click the
      <Mark>
        <FadersHorizontalIcon className="size-3.5" />
      </Mark>
      button on the left of the address bar above.
    </>
  ),
  allow: "Set Camera to Allow.",
};

const FIREFOX: Coach = {
  side: "top",
  find: (
    <>
      Click the
      <Mark>
        <LockIcon className="size-3.5" />
      </Mark>
      padlock on the left of the address bar above.
    </>
  ),
  allow: "Open Connection settings, then clear the blocked camera.",
};

const SAFARI: Coach = {
  side: "top",
  find: <>Open the Safari menu, then Settings for This Website.</>,
  allow: "Set Camera to Allow.",
};

/** Safari and Brave put the address bar at the foot of an iPhone screen. */
const IPHONE: Coach = {
  side: "bottom",
  find: (
    <>
      Tap the
      <Mark>
        <span className="text-[10px] font-semibold">aA</span>
      </Mark>
      button in the address bar below.
    </>
  ),
  allow: "Open Website Settings, then set Camera to Allow.",
};

/**
 * Which browser is reading, close enough to name its button. A page cannot see
 * the browser's own chrome, so naming and drawing the button does the work an
 * arrow cannot: the band below only says which bar to look along.
 */
function coachFor(): Coach {
  const ua = navigator.userAgent;

  if (/iPhone|iPod/.test(ua)) return IPHONE;
  if (/Firefox\//.test(ua)) return FIREFOX;
  // Brave, Chrome, Edge and Opera all say Chrome, and all draw the sliders.
  if (/Chrome|Chromium|CriOS/.test(ua)) return CHROMIUM;
  if (/Safari\//.test(ua)) return SAFARI;

  return CHROMIUM;
}

function Step(props: { index: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm">
      <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
        {props.index}
      </span>
      <span className="leading-snug">{props.children}</span>
    </li>
  );
}

/**
 * The coach mark for a camera the reader turned off. It covers the page on
 * purpose, so the marked bar reads as one instruction with the card.
 * Dismissing it gives the page back, with the paste box still there.
 */
export function CameraBlockedOverlay(props: CameraBlockedOverlayProps) {
  const [dismissed, setDismissed] = useState(false);
  const blocked = props.fault?.kind === "refused";

  // The reader decides once. A second refusal does not reopen what they closed.
  if (!blocked || dismissed) return null;

  const coach = coachFor();
  const top = coach.side === "top";

  return (
    <Dialog open onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "left-4 max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 sm:max-w-sm",
          top ? "top-4 bottom-auto" : "top-auto bottom-4",
        )}
      >
        {/* The whole bar is marked, because the button inside it sits wherever
            this reader's toolbar happens to put it. The band goes to the body:
            the popup animates a transform, and a transformed parent would make
            this fixed span measure against the card instead of the screen. */}
        {createPortal(
          <span
            aria-hidden
            className={cn(
              "bg-primary pointer-events-none fixed inset-x-0 z-[60] h-1 animate-pulse",
              top ? "top-0" : "bottom-0",
            )}
          />,
          document.body,
        )}

        {/* Ties the card to that bar. The card sits 1rem in, so the line is 1rem. */}
        <span
          aria-hidden
          className={cn("bg-primary absolute left-8 h-4 w-0.5", top ? "-top-4" : "-bottom-4")}
        />

        <DialogHeader>
          <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
            <VideoCameraIcon className="size-4" />
          </div>
          <DialogTitle>The camera is turned off for this site</DialogTitle>
          <DialogDescription>
            Your browser holds the switch, so we cannot turn it on from here.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-2">
          <Step index={1}>{coach.find}</Step>
          <Step index={2}>{coach.allow}</Step>
          <Step index={3}>Come back here and select Try again.</Step>
        </ol>

        <p className="text-muted-foreground text-xs">
          If the camera stays off, reload the page. You can always paste the code by hand instead.
        </p>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={props.onRetry}>
            <ArrowClockwiseIcon />
            Try again
          </Button>
          <DialogClose render={<Button variant="outline" />}>Not now</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
