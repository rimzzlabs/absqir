import { parseCheckInLink } from "@absqir/core/check-in-link";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { ScanIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { CheckInPass } from "@/components/check-in/check-in-pass";
import { CheckInRecent } from "@/components/check-in/check-in-recent";
import { CheckInResult } from "@/components/check-in/check-in-result";
import { CheckInSteps } from "@/components/check-in/check-in-steps";
import { ScanViewfinder } from "@/components/check-in/scan-viewfinder";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { CameraBlockedOverlay } from "@/components/shared/camera-blocked-overlay";
import { PageHeader } from "@/components/shared/page-header";
import { useCamera } from "@/components/shared/use-camera";
import { useCheckIn } from "@/mutations/use-check-in";
import { useMySessions } from "@/queries/use-my";

/** The same link seen again within this window is one scan, not two. */
const REPEAT_MS = 4000;

function Scanner() {
  const checkIn = useCheckIn();
  const [manual, setManual] = useState("");
  const [rejected, setRejected] = useState<string | null>(null);
  const recent = useRef(new Map<string, number>());

  const submit = (text: string) => {
    if (checkIn.isPending || checkIn.isSuccess) return;

    const link = parseCheckInLink(text, window.location.origin);
    if (!link) {
      setRejected("That is not the code from the room screen.");
      return;
    }

    const now = Date.now();
    const last = recent.current.get(link.token) ?? 0;
    if (now - last < REPEAT_MS) return;
    recent.current.set(link.token, now);

    setRejected(null);
    checkIn.mutate(link);
  };

  // The camera stops once the reader is in; a result should not flicker.
  const camera = useCamera(submit, {
    enabled: !checkIn.isSuccess,
    fallback: "Paste the link printed under the code on the room screen.",
  });
  const progressNote = checkIn.isPending ? "Checking you in." : "";
  const error = rejected ?? checkIn.error?.message ?? null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanIcon />
          Scan the room screen
        </CardTitle>
        <CardDescription>
          Hold the code inside the frame. It reads on its own, so there is nothing to press.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* The region lives through every state, so a reader hears the outcome. */}
        <p aria-live="polite" className="sr-only">
          {checkIn.isSuccess
            ? `${checkIn.data.personName}, you are in for ${checkIn.data.sessionTitle}.`
            : progressNote}
        </p>

        <div className={cn("mx-auto w-full max-w-md", checkIn.isSuccess && "my-auto")}>
          {checkIn.isSuccess ? (
            <CheckInResult result={checkIn.data} onAgain={() => checkIn.reset()} />
          ) : (
            <ScanViewfinder
              video={camera.video}
              active={camera.active}
              error={camera.fault?.message ?? null}
              busy={checkIn.isPending}
            />
          )}
        </div>

        {!checkIn.isSuccess && error ? (
          <Alert variant="destructive">
            <WarningCircleIcon />
            <AlertTitle>Not checked in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {checkIn.isSuccess ? null : (
          <form
            className="border-border mt-auto flex flex-col gap-2 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (manual.trim()) submit(manual.trim());
              setManual("");
            }}
          >
            <Label htmlFor="check-in-link">Cannot scan? Paste the link</Label>
            <div className="flex gap-2">
              <Input
                id="check-in-link"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
              <Button type="submit" variant="outline" disabled={checkIn.isPending}>
                Check in
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              The room screen prints the link under its code.
            </p>
          </form>
        )}
      </CardContent>

      <CameraBlockedOverlay fault={camera.fault} onRetry={camera.retry} />
    </Card>
  );
}

function MemberCheckInBody() {
  const sessions = useMySessions();
  const rows = A.flatMap(sessions.data?.pages ?? [], (page) => page.items);
  const [passFor, setPassFor] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Check in"
        description="Point the camera at the screen in the room. Or show your pass to the organizer."
      />

      {/* The camera keeps a narrow rail of its own. Everything else stacks in the
          wide rail, so the tall card leaves no hole under the short ones. */}
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]">
        <Scanner />

        <div className="@container flex flex-col gap-4">
          <div className="grid gap-4 @2xl:grid-cols-2">
            <CheckInPass
              sessions={rows}
              pending={sessions.isPending}
              error={sessions.error}
              onPass={setPassFor}
            />

            <CheckInSteps />
          </div>

          <CheckInRecent />
        </div>
      </div>

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
    </>
  );
}

/** The member's way in: scan the room screen, or show a pass at the door. */
export function MemberCheckInPage() {
  return (
    <Providers>
      <MemberCheckInBody />
    </Providers>
  );
}
