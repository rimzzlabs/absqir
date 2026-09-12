import { formatDate } from "@absqir/core/date";
import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Input } from "@absqir/ui/input";
import { A } from "@mobily/ts-belt";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Providers } from "@/components/providers";
import { CameraBlockedOverlay } from "@/components/shared/camera-blocked-overlay";
import { FormError } from "@/components/shared/form-error";
import { AttendanceStatusBadge, EventStatusBadge } from "@/components/shared/status-badge";
import { useCamera } from "@/components/shared/use-camera";
import { type ScanResult, useScan } from "@/mutations/use-scan";
import { useEvent } from "@/queries/use-events";

export interface ScannerProps {
  eventId: string;
}

interface ScanEntry {
  key: string;
  at: Date;
  result: ScanResult | null;
  error: string | null;
}

/** The same code seen again within this window is one scan, not two. */
const REPEAT_MS = 4000;

function ScannerBody(props: ScannerProps) {
  const event = useEvent(props.eventId);
  const scan = useScan();
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [manual, setManual] = useState("");
  const recent = useRef(new Map<string, number>());

  const submit = (code: string) => {
    const now = Date.now();
    const last = recent.current.get(code) ?? 0;
    if (now - last < REPEAT_MS) return;
    recent.current.set(code, now);

    scan.mutate(
      { eventId: props.eventId, code },
      {
        onSuccess: (result) =>
          setEntries((list) =>
            [{ key: `${code}:${now}`, at: new Date(), result, error: null }, ...list].slice(0, 20),
          ),
        onError: (error) =>
          setEntries((list) =>
            [
              { key: `${code}:${now}`, at: new Date(), result: null, error: error.message },
              ...list,
            ].slice(0, 20),
          ),
      },
    );
  };

  const camera = useCamera(submit, {
    fallback: "Ask the member for the pass code under their QR, then type it below.",
  });
  const data = event.data;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <a
          href={`/events/${props.eventId}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Back
        </a>
        {data ? <EventStatusBadge status={data.status} /> : null}
      </div>

      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {data?.title ?? "Scanner"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Point the camera at the pass on the member's phone. Each pass counts once.
        </p>
      </div>

      <div className="bg-muted relative aspect-square overflow-hidden rounded-2xl">
        <video ref={camera.video} muted playsInline className="size-full object-cover" />
        {!camera.active && !camera.fault ? (
          <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
            Opening the camera…
          </p>
        ) : null}
      </div>

      {camera.fault ? (
        <Alert>
          <AlertTitle>The camera is not available</AlertTitle>
          <AlertDescription>{camera.fault.message}</AlertDescription>
        </Alert>
      ) : null}

      <CameraBlockedOverlay fault={camera.fault} onRetry={camera.retry} />

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (manual.trim()) submit(manual.trim());
          setManual("");
        }}
      >
        <Input
          value={manual}
          onChange={(event) => setManual(event.target.value)}
          placeholder="Or paste a pass here"
          aria-label="Pass code"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={scan.isPending}>
          Check in
        </Button>
      </form>

      <FormError error={event.error} />

      <ul className="space-y-2" aria-live="polite">
        {A.map(entries, (entry) => (
          <li
            key={entry.key}
            className="border-border flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
          >
            {entry.result ? (
              <CheckCircleIcon weight="fill" className="size-5 shrink-0 text-emerald-500" />
            ) : (
              <WarningCircleIcon weight="fill" className="text-destructive size-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              {entry.result ? (
                <>
                  <p className="truncate font-medium">{entry.result.personName}</p>
                  <p className="text-muted-foreground text-xs">
                    {entry.result.already ? "Already in since " : "Checked in at "}
                    {formatDate(new Date(entry.result.checkedInAt), "time")}
                  </p>
                </>
              ) : (
                <p className="text-destructive">{entry.error}</p>
              )}
            </div>
            {entry.result ? <AttendanceStatusBadge status={entry.result.status} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Scanner(props: ScannerProps) {
  return (
    <Providers>
      <ScannerBody {...props} />
    </Providers>
  );
}
