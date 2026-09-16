import { formatRange } from "@absqir/core/date";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { match, P } from "ts-pattern";
import { TokenTimer } from "@/components/events/token-timer";
import { Providers } from "@/components/providers";
import { BackLink } from "@/components/shared/back-link";
import { FormError } from "@/components/shared/form-error";
import { EventStatusBadge } from "@/components/shared/status-badge";
import { useEvent } from "@/queries/use-events";
import { useQrToken } from "@/queries/use-qr-token";

export interface QrDisplayProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  eventId: string;
}

/** The room screen. Big code, few words, rotates on its own. */
function QrScreen(props: QrDisplayProps) {
  const t = useTranslate();
  const event = useEvent(props.eventId);
  const qr = useQrToken(props.eventId);
  const data = event.data;
  const checkedIn = match(data)
    .with(P.nullish, () => 0 as const)
    .otherwise((data) => data.counts.present + data.counts.late);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <BackLink href={`/events/${props.eventId}`} className="absolute top-4 left-4">
        {t("common:actions.back")}
      </BackLink>

      {match(data)
        .with(P.nullish, () => null)
        .otherwise((data) => (
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{data.title}</h1>
            <p className="text-muted-foreground text-sm">
              {formatRange(new Date(data.startsAt), new Date(data.endsAt))}
            </p>
            <div className="flex items-center justify-center gap-3">
              <EventStatusBadge status={data.status} />
              <span className="text-muted-foreground text-sm tabular-nums">
                {t("events:display.checkedIn", {
                  checkedIn,
                  expected: data.counts.expected,
                })}
              </span>
            </div>
          </div>
        ))}

      {match(data)
        .with({ status: "scheduled" }, (data) => (
          <p role="status" className="text-muted-foreground max-w-sm text-sm">
            {t("events:display.opensSoon", { count: data.opensBeforeMinutes })}
          </p>
        ))
        .otherwise(() => null)}

      {match(data)
        .with({ status: "done" }, () => (
          <p role="status" className="text-destructive text-sm font-medium">
            {t("events:display.closed")}
          </p>
        ))
        .otherwise(() => null)}

      {match(qr)
        .with({ isPending: true }, () => (
          <p className="text-muted-foreground text-sm">{t("events:display.preparing")}</p>
        ))
        .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
        .with({ data: P.select(P.nonNullable) }, (token) => (
          <div className="flex w-[min(80vw,60vh)] flex-col gap-3">
            <img
              src={token.qrDataUrl}
              alt={t("events:display.qrAlt")}
              className="border-border w-full rounded-2xl border bg-white p-4"
            />
            {/* A scheduled or a closed event turns no code over, so the time
                left says nothing. The token carries the status the server saw
                as it signed, so the two never disagree on screen. */}
            {match(token.status)
              .with("running", () => <TokenTimer expiresAt={token.expiresAt} />)
              .otherwise(() => null)}
          </div>
        ))
        .otherwise(() => null)}

      <p className="text-muted-foreground max-w-sm text-sm">{t("events:display.hint")}</p>
    </div>
  );
}

export function QrDisplay(props: QrDisplayProps) {
  return (
    <Providers locale={props.locale}>
      <QrScreen {...props} />
    </Providers>
  );
}
