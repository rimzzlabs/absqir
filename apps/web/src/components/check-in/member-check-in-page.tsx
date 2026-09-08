import { parseCheckInLink } from "@absqir/core/check-in-link";
import { formatDate } from "@absqir/core/date";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { Input } from "@absqir/ui/input";
import { Reveal } from "@absqir/ui/reveal";
import { Skeleton } from "@absqir/ui/skeleton";
import { CheckCircleIcon, TicketIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { match, P } from "ts-pattern";
import { PassDialog } from "@/components/my/pass-dialog";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import { AttendanceStatusBadge } from "@/components/shared/status-badge";
import { useCamera } from "@/components/shared/use-camera";
import { useCheckIn } from "@/mutations/use-check-in";
import { type MySession, useMySessions } from "@/queries/use-my";

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
  const camera = useCamera(submit, { enabled: !checkIn.isSuccess });
  const error = rejected ?? checkIn.error?.message ?? null;

  if (checkIn.isSuccess) {
    const result = checkIn.data;

    return (
      <Reveal className="border-border space-y-4 rounded-xl border p-6">
        <CheckCircleIcon weight="fill" className="size-10 text-emerald-500" />
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {result.already
              ? `Already in, ${result.personName}`
              : `You are in, ${result.personName}`}
          </h2>
          <p className="text-muted-foreground text-sm">{result.sessionTitle}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <AttendanceStatusBadge status={result.status} />
          <span className="text-muted-foreground tabular-nums">
            {formatDate(new Date(result.checkedInAt), "time")}
          </span>
        </div>
        <Button variant="outline" onClick={() => checkIn.reset()}>
          Scan another
        </Button>
      </Reveal>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted relative aspect-square max-w-md overflow-hidden rounded-2xl">
        <video ref={camera.video} muted playsInline className="size-full object-cover" />
        {!camera.active && !camera.error ? (
          <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
            Opening the camera…
          </p>
        ) : null}
        {checkIn.isPending ? (
          <p className="bg-background/80 absolute inset-0 flex items-center justify-center text-sm font-medium">
            Checking you in…
          </p>
        ) : null}
      </div>

      {camera.error ? (
        <Alert className="max-w-md">
          <AlertTitle>No camera</AlertTitle>
          <AlertDescription>{camera.error}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="max-w-md">
          <WarningCircleIcon />
          <AlertTitle>Not checked in</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="flex max-w-md gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (manual.trim()) submit(manual.trim());
          setManual("");
        }}
      >
        <Input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Or paste the link from the screen"
          aria-label="Link from the screen"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={checkIn.isPending}>
          Check in
        </Button>
      </form>
    </div>
  );
}

function PassRow(props: { session: MySession; onPass: (id: string) => void }) {
  const { session } = props;

  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="text-muted-foreground text-xs">
          Until {formatDate(new Date(session.endsAt), "time")}
          {session.record ? " · you are in" : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => props.onPass(session.id)}>
        <TicketIcon />
        My pass
      </Button>
    </li>
  );
}

function Passes() {
  const sessions = useMySessions();
  const rows = sessions.data?.pages.flatMap((page) => page.items) ?? [];
  const [passFor, setPassFor] = useState<string | null>(null);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Show my pass</CardTitle>
        <CardDescription>
          When the organizer scans instead, show them this. One pass per event.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {match(sessions)
          .with({ isPending: true }, () => <Skeleton className="h-16 rounded-lg" />)
          .with({ isError: true, error: P.select() }, (error) => (
            <p className="text-destructive text-sm">{error.message}</p>
          ))
          .with({ data: P.nonNullable }, () => {
            const running = rows.filter((row) => row.status === "running");
            const next = rows.find((row) => row.status === "scheduled");

            if (running.length > 0) {
              return (
                <ul className="divide-border -my-3 divide-y">
                  {running.map((row) => (
                    <PassRow key={row.id} session={row} onPass={setPassFor} />
                  ))}
                </ul>
              );
            }

            return (
              <p className="text-muted-foreground text-sm">
                {next
                  ? `Nothing runs right now. Next: ${next.title}, ${formatDate(new Date(next.startsAt), "weekdayDateTime")}.`
                  : "Nothing runs right now, and nothing is scheduled for you yet."}
              </p>
            );
          })
          .otherwise(() => null)}
      </CardContent>

      <PassDialog sessionId={passFor} onClose={() => setPassFor(null)} />
    </Card>
  );
}

/** The member's way in: scan the room screen, or show a pass at the door. */
export function MemberCheckInPage() {
  return (
    <Providers>
      <PageHeader
        title="Check in"
        description="Point the camera at the screen in the room. Or show your pass to the organizer."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,28rem)]">
        <Scanner />
        <Passes />
      </div>
    </Providers>
  );
}
