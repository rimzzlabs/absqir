import { formatDate } from "@absqir/core/date";
import { formatDistance } from "@absqir/core/geo";
import { isRiskReason, RISK_REASON_TEXT } from "@absqir/core/location-risk";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Textarea } from "@absqir/ui/textarea";
import { A } from "@mobily/ts-belt";
import { CheckCircleIcon, FlagIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
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

/** One labelled fact. A bare number in a sentence is not readable. */
function Fact(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd>{props.children}</dd>
    </div>
  );
}

/** Beyond this a bad fix stops explaining the gap on its own. */
const FAR_METERS = 1000;

/**
 * What the refused attempt recorded, as facts rather than prose.
 *
 * The room code and the distance are both stated, and neither is dressed up
 * as a conclusion. A live code proves the member saw the screen. A reading
 * kilometres away says they were not there. Both cannot be true, and which
 * one is wrong is the decision itself, so the page names the conflict and
 * leaves it to the organizer.
 */
function Evidence(props: { attempt: NonNullable<CheckInReport["attempt"]> }) {
  const { attempt } = props;
  const reasons = A.filter(attempt.riskReasons, isRiskReason);
  const far = (attempt.distanceMeters ?? 0) >= FAR_METERS;

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase">What was recorded</p>

      <dl className="flex flex-col gap-1.5 text-sm">
        <Fact label="Scanned">
          {match(attempt.heldRoomCode)
            .with(true, () => "A live code from the room screen")
            .otherwise(() => "A pass, read by the organizer's scanner")}
        </Fact>

        <Fact label="Distance">
          {match(attempt.distanceMeters)
            .with(P.number, (meters) => `${formatDistance(meters)} from the place`)
            .otherwise(() =>
              match(attempt.verdict)
                .with("missing", () => "The device sent no location")
                .with("coarse", () => "Too vague to place them")
                .otherwise(() => "Not recorded"),
            )}
        </Fact>

        <Fact label="Accuracy">
          {match(attempt.accuracyMeters)
            .with(P.number, (meters) => `About ${Math.round(meters)} m`)
            .otherwise(() => "Not recorded")}
        </Fact>

        <Fact label="Scanned at">{formatDate(new Date(attempt.at), "dateTime")}</Fact>
      </dl>

      {match(attempt.heldRoomCode && far)
        .with(true, () => (
          <p className="flex items-start gap-2 border-t pt-3 text-sm">
            <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              These two do not fit. A live code means somebody was at the screen, and a reading this
              far away means they were not. Either the phone placed them badly, which happens
              indoors, or the code reached somebody else.
            </span>
          </p>
        ))
        .otherwise(() => null)}

      {match(reasons.length)
        .with(0, () => null)
        .otherwise(() => (
          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">Signals</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {A.map(reasons, (reason) => (
                <li key={reason}>{RISK_REASON_TEXT[reason]}</li>
              ))}
            </ul>
          </div>
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
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{report.person.name}</p>
            {/* Three instants live on this card. Each one says which it is. */}
            <p className="text-muted-foreground text-sm">
              {report.event.title} · started{" "}
              {formatDate(new Date(report.event.startsAt), "dateTime")}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-medium uppercase">They said</p>
          <p className="text-sm">{report.message}</p>
        </div>

        {match(report.attempt)
          .with(P.nonNullable, (attempt) => <Evidence attempt={attempt} />)
          .otherwise(() => (
            <p className="text-muted-foreground text-sm">
              The refused check-in is no longer on record, so their own words are all there is.
            </p>
          ))}

        {match(pending)
          .with(true, () => (
            <div className="flex flex-col gap-2 border-t pt-4">
              <Textarea
                aria-label={`Note for ${report.person.name}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Optional. The member reads this with the decision."
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
                Marking them in records the time they scanned, not the time you decided. Either way
                they get a notification, and the event cannot be reported again.
              </p>
            </div>
          ))
          .otherwise(() => (
            <div className="text-muted-foreground flex flex-col gap-1 border-t pt-4 text-sm">
              <p>
                {match(report.status)
                  .with("approved", () => "Marked in")
                  .otherwise(() => "Declined")}
                {match(report.decidedAt)
                  .with(P.string, (at) => ` · ${formatDate(new Date(at), "dateTime")}`)
                  .otherwise(() => "")}
              </p>
              {match(report.decisionNote)
                .with(P.string.minLength(1), (decisionNote) => (
                  <p className="border-border border-l-2 pl-3">{decisionNote}</p>
                ))
                .otherwise(() => null)}
            </div>
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
