import { useTranslate } from "@absqir/i18n/react";
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
import { match } from "ts-pattern";
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
  /** The key under `common:camera` that words the two steps. */
  key: "chromium" | "firefox" | "safari" | "iphone";
  /** The button as the browser draws it, between the two halves of step one. */
  mark: ReactNode;
}

const CHROMIUM: Coach = {
  side: "top",
  key: "chromium",
  mark: (
    <Mark>
      <FadersHorizontalIcon className="size-3.5" />
    </Mark>
  ),
};

const FIREFOX: Coach = {
  side: "top",
  key: "firefox",
  mark: (
    <Mark>
      <LockIcon className="size-3.5" />
    </Mark>
  ),
};

const SAFARI: Coach = { side: "top", key: "safari", mark: null };

/** Safari and Brave put the address bar at the foot of an iPhone screen. */
const IPHONE: Coach = {
  side: "bottom",
  key: "iphone",
  mark: (
    <Mark>
      <span className="text-[10px] font-semibold">aA</span>
    </Mark>
  ),
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
  const t = useTranslate();
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
          match(top)
            .with(true, () => "top-4 bottom-auto" as const)
            .otherwise(() => "top-auto bottom-4" as const),
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
              match(top)
                .with(true, () => "top-0" as const)
                .otherwise(() => "bottom-0" as const),
            )}
          />,
          document.body,
        )}

        {/* Ties the card to that bar. The card sits 1rem in, so the line is 1rem. */}
        <span
          aria-hidden
          className={cn(
            "bg-primary absolute left-8 h-4 w-0.5",
            match(top)
              .with(true, () => "-top-4" as const)
              .otherwise(() => "-bottom-4" as const),
          )}
        />

        <DialogHeader>
          <div className="bg-muted flex size-8 items-center justify-center rounded-lg">
            <VideoCameraIcon className="size-4" />
          </div>
          <DialogTitle>{t("common:camera.title")}</DialogTitle>
          <DialogDescription>{t("common:camera.description")}</DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-2">
          <Step index={1}>
            {match(coach.key)
              .with("safari", (key) => t(`common:camera.${key}.find`))
              .otherwise((key) => (
                <>
                  {t(`common:camera.${key}.findBefore`)}
                  {coach.mark}
                  {t(`common:camera.${key}.findAfter`)}
                </>
              ))}
          </Step>
          <Step index={2}>{t(`common:camera.${coach.key}.allow`)}</Step>
          <Step index={3}>{t("common:camera.lastStep")}</Step>
        </ol>

        <p className="text-muted-foreground text-xs">{t("common:camera.note")}</p>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={props.onRetry}>
            <ArrowClockwiseIcon />
            {t("common:actions.tryAgain")}
          </Button>
          <DialogClose render={<Button variant="outline" />}>
            {t("common:actions.notNow")}
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
