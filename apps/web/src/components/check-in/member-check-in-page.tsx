import { parseCheckInLink } from "@absqir/core/check-in-link";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { MapPinIcon, ScanIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { match, P } from "ts-pattern";
import { CheckInPass } from "@/components/check-in/check-in-pass";
import { CheckInRecent } from "@/components/check-in/check-in-recent";
import { CheckInResult } from "@/components/check-in/check-in-result";
import { CheckInSteps } from "@/components/check-in/check-in-steps";
import { ReportAction } from "@/components/check-in/report-action";
import { ScanViewfinder } from "@/components/check-in/scan-viewfinder";
import { opensAtOf } from "@/components/my/opens-at";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { CameraBlockedOverlay } from "@/components/shared/camera-blocked-overlay";
import { PageHeader } from "@/components/shared/page-header";
import { useCamera } from "@/components/shared/use-camera";
import { useWarmLocation } from "@/lib/use-warm-location";
import { useCheckIn } from "@/mutations/use-check-in";
import { useMyEvents } from "@/queries/use-my";

/** The same link seen again within this window is one scan, not two. */
const REPEAT_MS = 4000;

/**
 * Every block stacked in the scanner card shares one edge. The card and the
 * viewfinder draw theirs with a ring, and an Alert draws a border at a
 * tighter radius, so an alert dropped under the viewfinder does not line up
 * with it.
 */
const BLOCK_EDGE = "rounded-xl border-0 ring-1 ring-foreground/10";

function Scanner() {
  const t = useTranslate();
  const checkIn = useCheckIn();
  const [manual, setManual] = useState("");
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const recent = useRef(new Map<string, number>());

  const submit = (text: string) => {
    if (checkIn.isPending || checkIn.isSuccess) return;

    const link = parseCheckInLink(text, window.location.origin);
    if (!link) {
      setRejected(t("checkin:scanner.notALink"));
      return;
    }

    const now = Date.now();
    const last = recent.current.get(link.token) ?? 0;
    if (now - last < REPEAT_MS) return;
    recent.current.set(link.token, now);

    setRejected(null);
    // The report needs the event, and a refusal does not carry it back.
    setLastEventId(link.eventId);
    checkIn.mutate(link);
  };

  // The camera stops once the reader is in; a result should not flicker.
  const camera = useCamera(submit, {
    enabled: !checkIn.isSuccess,
    fallback: t("checkin:scanner.pasteFallback"),
  });
  const progressNote = match(checkIn.stage)
    .with("locating", () => t("checkin:scanner.locatingNote"))
    .with("checking", () => t("checkin:scanner.checkingNote"))
    .otherwise(() => "" as const);
  const error = rejected ?? checkIn.error?.message ?? null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanIcon />
          {t("checkin:scanner.title")}
        </CardTitle>
        <CardDescription>{t("checkin:scanner.description")}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* The region lives through every state, so a reader hears the outcome. */}
        <p aria-live="polite" className="sr-only">
          {match(checkIn.data)
            .with(P.nonNullable, (data) =>
              t("checkin:scanner.youAreIn", { name: data.personName, event: data.eventTitle }),
            )
            .otherwise(() => progressNote)}
        </p>

        <div className={cn("mx-auto w-full max-w-md", checkIn.isSuccess && "my-auto")}>
          {match(checkIn.data)
            .with(P.nonNullable, (data) => (
              <CheckInResult result={data} onAgain={() => checkIn.reset()} />
            ))
            .otherwise(() => (
              <ScanViewfinder
                video={camera.video}
                active={camera.active}
                error={camera.fault?.message ?? null}
                busy={checkIn.isPending}
              />
            ))}
        </div>

        {/* The permission prompt appears here and nowhere else, so the reason
            for it is written next to it. */}
        {match(checkIn.stage)
          .with("locating", () => (
            <Alert className={BLOCK_EDGE}>
              <MapPinIcon />
              <AlertTitle>{t("checkin:scanner.locatingTitle")}</AlertTitle>
              <AlertDescription>{t("checkin:scanner.locatingHint")}</AlertDescription>
            </Alert>
          ))
          .otherwise(() => null)}

        {match(Boolean(!checkIn.isSuccess && error))
          .with(true, () => (
            <Alert variant="destructive" className={BLOCK_EDGE}>
              <WarningCircleIcon />
              <AlertTitle>{t("checkin:scanner.refusedTitle")}</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-2">
                <span>{error}</span>

                {/* The place check is the one rule that can turn away somebody
                    who did everything right, so it is the one that offers a
                    way back. */}
                {match([lastEventId, checkIn.locationRefusal] as const)
                  .with([P.string, P.nonNullable], ([eventId, refusal]) => (
                    <ReportAction
                      key={refusal.attemptId ?? eventId}
                      eventId={eventId}
                      attemptId={refusal.attemptId}
                      reportStatus={refusal.reportStatus}
                      refusal={error ?? ""}
                    />
                  ))
                  .otherwise(() => null)}
              </AlertDescription>
            </Alert>
          ))
          .otherwise(() => null)}

        {match(checkIn.isSuccess)
          .with(true, () => null)
          .otherwise(() => (
            <form
              className="border-border mt-auto flex flex-col gap-2 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (manual.trim()) submit(manual.trim());
                setManual("");
              }}
            >
              <Label htmlFor="check-in-link">{t("checkin:scanner.manualLabel")}</Label>
              <div className="flex gap-2">
                <Input
                  id="check-in-link"
                  value={manual}
                  onChange={(event) => setManual(event.target.value)}
                  placeholder="https://…"
                  autoComplete="off"
                />
                <Button type="submit" variant="outline" disabled={checkIn.isPending}>
                  {t("checkin:scanner.manualSubmit")}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{t("checkin:scanner.manualHint")}</p>
            </form>
          ))}
      </CardContent>

      <CameraBlockedOverlay fault={camera.fault} onRetry={camera.retry} />
    </Card>
  );
}

function MemberCheckInBody() {
  const t = useTranslate();
  const events = useMyEvents();
  const rows = A.flatMap(events.data?.pages ?? [], (page) => page.items);
  const [passFor, setPassFor] = useState<string | null>(null);

  // Raise the permission prompt now, while the member is still walking up to
  // the screen, rather than after the scan when the code is already ticking.
  const now = Date.now();
  const fenceIsNear = A.some(
    rows,
    (event) =>
      event.requireLocation &&
      opensAtOf(event).getTime() <= now &&
      new Date(event.endsAt).getTime() >= now,
  );
  useWarmLocation(fenceIsNear);

  return (
    <>
      <PageHeader title={t("checkin:title")} description={t("checkin:description")} />

      {/* The camera keeps a narrow rail of its own. Everything else stacks in the
          wide rail, so the tall card leaves no hole under the short ones. */}
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]">
        <Scanner />

        <div className="@container flex flex-col gap-4">
          <div className="grid gap-4 @2xl:grid-cols-2">
            <CheckInPass
              events={rows}
              pending={events.isPending}
              error={events.error}
              onPass={setPassFor}
            />

            <CheckInSteps />
          </div>

          <CheckInRecent />
        </div>
      </div>

      <PassDialog eventId={passFor} onClose={() => setPassFor(null)} />
    </>
  );
}

/** The member's way in: scan the room screen, or show a pass at the door. */
export interface MemberCheckInPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
}

export function MemberCheckInPage(props: MemberCheckInPageProps) {
  return (
    <Providers locale={props.locale}>
      <MemberCheckInBody />
    </Providers>
  );
}
