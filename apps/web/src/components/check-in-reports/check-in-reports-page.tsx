import { formatDate } from "@absqir/core/date";
import { isRiskReason, RISK_REASON_TEXT } from "@absqir/core/location-risk";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Textarea } from "@absqir/ui/textarea";
import { A } from "@mobily/ts-belt";
import {
  CheckCircleIcon,
  FlagIcon,
  MapPinIcon,
  QrCodeIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { useDecideCheckInReport } from "@/mutations/use-check-in-report";
import {
  type CheckInReport,
  type ReportScope,
  useCheckInReports,
} from "@/queries/use-check-in-reports";

const SCOPES = ["pending", "decided", "all"] as const;

function StatusBadge(props: { status: CheckInReport["status"] }) {
  return match(props.status)
    .with("approved", () => <Badge variant="secondary">Approved</Badge>)
    .with("declined", () => <Badge variant="outline">Declined</Badge>)
    .otherwise(() => <Badge>Waiting</Badge>);
}

/**
 * What the refused attempt recorded.
 *
 * The room-screen line comes first because it settles most of these on its
 * own: the place check only runs after that code has been verified, so
 * anyone here held a live token and stood in front of the screen.
 */
function Evidence(props: { attempt: NonNullable<CheckInReport["attempt"]> }) {
  const { attempt } = props;
  const reasons = A.filter(attempt.riskReasons, isRiskReason);

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3 text-sm">
      <p className="flex items-start gap-2">
        <QrCodeIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {match(attempt.heldRoomCode)
            .with(true, () => (
              <>
                <b>Scanned the room screen.</b> The code is checked before the place is, so this
                person was in front of the screen.
              </>
            ))
            .otherwise(() => (
              <>
                <b>Checked in at the door.</b> The reading belongs to the organizer's scanner.
              </>
            ))}
        </span>
      </p>

      <p className="text-muted-foreground flex items-start gap-2">
        <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {match(attempt.distance)
            .with(P.string, (distance) => `${distance} from the place`)
            .otherwise(() => "No usable reading")}
          {match(attempt.accuracyMeters)
            .with(P.number, (meters) => `, accurate to about ${Math.round(meters)} m`)
            .otherwise(() => "")}
          {` · ${formatDate(new Date(attempt.at), "dateTime")}`}
        </span>
      </p>

      {match(reasons.length)
        .with(0, () => null)
        .otherwise(() => (
          <ul className="text-muted-foreground space-y-1 pl-6 text-xs">
            {A.map(reasons, (reason) => (
              <li key={reason}>{RISK_REASON_TEXT[reason]}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function ReportCard(props: { report: CheckInReport }) {
  const { report } = props;
  const decide = useDecideCheckInReport();
  const [note, setNote] = useState("");
  const pending = report.status === "pending";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{report.person.name}</p>
            <p className="text-muted-foreground text-sm">
              {report.event.title} · {formatDate(new Date(report.event.startsAt), "dateTime")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* A person who reports every event is worth noticing. */}
            {match(report.priorReports)
              .with(0, () => null)
              .otherwise((count) => (
                <Badge variant="outline">
                  {count} earlier{" "}
                  {match(count)
                    .with(1, () => "report")
                    .otherwise(() => "reports")}
                </Badge>
              ))}
            <StatusBadge status={report.status} />
          </div>
        </div>

        <p className="text-sm">{report.message}</p>

        {match(report.attempt)
          .with(P.nonNullable, (attempt) => <Evidence attempt={attempt} />)
          .otherwise(() => null)}

        {match(pending)
          .with(true, () => (
            <div className="flex flex-col gap-2">
              <Textarea
                aria-label={`Note for ${report.person.name}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Optional note. The member does not see this."
              />
              <FormError error={decide.error} />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({ id: report.id, approve: true, note: note.trim() || null })
                  }
                >
                  <CheckCircleIcon />
                  Mark them in
                </Button>
                <Button
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({ id: report.id, approve: false, note: note.trim() || null })
                  }
                >
                  <XCircleIcon />
                  Decline
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Marking them in records the time they scanned, not the time you decided.
              </p>
            </div>
          ))
          .otherwise(() => (
            <p className="text-muted-foreground text-xs">
              {match(report.decidedAt)
                .with(P.string, (at) => `Decided ${formatDate(new Date(at), "dateTime")}`)
                .otherwise(() => "Decided")}
              {match(report.decisionNote)
                .with(P.string.minLength(1), (decisionNote) => ` · ${decisionNote}`)
                .otherwise(() => "")}
            </p>
          ))}
      </CardContent>
    </Card>
  );
}

function CheckInReportsBody() {
  const [scope, setScope] = useQueryState(
    "status",
    parseAsStringLiteral(SCOPES).withDefault("pending"),
  );
  const reports = useCheckInReports(scope as ReportScope);
  const rows = reports.data ?? [];

  return (
    <>
      <PageHeader
        title="Check-in problems"
        description="Members who say the place check refused them while they were at the event."
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as ReportScope)}>
        <TabsList>
          <TabsTrigger value="pending">Waiting</TabsTrigger>
          <TabsTrigger value="decided">Decided</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <FormError error={reports.error} />

      {match({ pending: reports.isPending, count: rows.length })
        .with({ pending: true }, () => (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ))
        .with({ count: 0 }, () => (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlagIcon />
              </EmptyMedia>
              <EmptyTitle>Nothing here</EmptyTitle>
              <EmptyDescription>
                Nobody has reported a problem with the place check. A member who is refused while
                standing at the event can send one from the check-in page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ))
        .otherwise(() => (
          <div className="flex flex-col gap-3">
            {A.map(rows, (report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ))}
    </>
  );
}

/** The organizer's queue of members the place check turned away. */
export function CheckInReportsPage() {
  return (
    <Providers>
      <CheckInReportsBody />
    </Providers>
  );
}
