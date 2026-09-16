import { formatDate } from "@absqir/core/date";
import { formatDistance } from "@absqir/core/geo";
import { isRiskReason } from "@absqir/core/location-risk";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent } from "@absqir/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { Label } from "@absqir/ui/label";
import { Skeleton } from "@absqir/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { Textarea } from "@absqir/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@absqir/ui/toggle-group";
import { A } from "@mobily/ts-belt";
import { CheckCircleIcon, FlagIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { PageHeader } from "@/components/shared/page-header";
import { attendanceLabel } from "@/components/shared/status-badge";
import { useDecideCheckInReport } from "@/mutations/use-check-in-report";
import {
  type CheckInReport,
  type ReportScope,
  useCheckInReports,
} from "@/queries/use-check-in-reports";

const SCOPES = ["pending", "decided", "all"] as const;

/** What an approval can write. Absent is what a decline already leaves. */
const RECORD_AS = ["present", "late", "excused"] as const;
type RecordAs = (typeof RECORD_AS)[number];

function StatusBadge(props: { status: CheckInReport["status"] }) {
  const t = useTranslate();

  return match(props.status)
    .with("approved", () => <Badge variant="secondary">{t("checkin:reports.approved")}</Badge>)
    .with("declined", () => <Badge variant="outline">{t("checkin:reports.declined")}</Badge>)
    .otherwise(() => <Badge>{t("checkin:reports.waiting")}</Badge>);
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
  const t = useTranslate();
  const reasons = A.filter(attempt.riskReasons, isRiskReason);
  const far = (attempt.distanceMeters ?? 0) >= FAR_METERS;

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {t("checkin:reports.recorded")}
      </p>

      <dl className="flex flex-col gap-1.5 text-sm">
        <Fact label={t("checkin:reports.scanned")}>
          {match(attempt.heldRoomCode)
            .with(true, () => t("checkin:reports.scannedRoomCode"))
            .otherwise(() => t("checkin:reports.scannedPass"))}
        </Fact>

        <Fact label={t("checkin:reports.distance")}>
          {match(attempt.distanceMeters)
            .with(P.number, (meters) =>
              t("checkin:reports.distanceFrom", { distance: formatDistance(meters) }),
            )
            .otherwise(() =>
              match(attempt.verdict)
                .with("missing", () => t("checkin:reports.noLocation"))
                .with("coarse", () => t("checkin:reports.coarse"))
                .otherwise(() => t("checkin:reports.notRecorded")),
            )}
        </Fact>

        <Fact label={t("checkin:reports.accuracy")}>
          {match(attempt.accuracyMeters)
            .with(P.number, (meters) =>
              t("checkin:reports.accuracyAbout", { meters: Math.round(meters) }),
            )
            .otherwise(() => t("checkin:reports.notRecorded"))}
        </Fact>

        <Fact label={t("checkin:reports.scannedAt")}>
          {formatDate(new Date(attempt.at), "dateTime")}
        </Fact>
      </dl>

      {match(attempt.heldRoomCode && far)
        .with(true, () => (
          <p className="flex items-start gap-2 border-t pt-3 text-sm">
            <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{t("checkin:reports.conflict")}</span>
          </p>
        ))
        .otherwise(() => null)}

      {match(reasons.length)
        .with(0, () => null)
        .otherwise(() => (
          <div className="flex flex-col gap-1 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              {t("checkin:reports.signals")}
            </p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              {A.map(reasons, (reason) => (
                <li key={reason}>{t(`checkin:risk.${reason}`)}</li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function ReportCard(props: { report: CheckInReport }) {
  const { report } = props;
  const t = useTranslate();
  const decide = useDecideCheckInReport();
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<RecordAs>(report.clockSays ?? "present");
  const pending = report.status === "pending";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{report.person.name}</p>
            {/* Three instants live on this card. Each one says which it is. */}
            <p className="text-muted-foreground text-sm">
              {t("checkin:reports.started", {
                event: report.event.title,
                when: formatDate(new Date(report.event.startsAt), "dateTime"),
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {match(report.priorReports)
              .with(0, () => null)
              .otherwise((count) => (
                <Badge variant="outline">{t("checkin:reports.earlier", { count })}</Badge>
              ))}
            <StatusBadge status={report.status} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs font-medium uppercase">
            {t("checkin:reports.theySaid")}
          </p>
          <p className="text-sm">{report.message}</p>
        </div>

        {match(report.attempt)
          .with(P.nonNullable, (attempt) => <Evidence attempt={attempt} />)
          .otherwise(() => (
            <p className="text-muted-foreground text-sm">{t("checkin:reports.noAttempt")}</p>
          ))}

        {match(pending)
          .with(true, () => (
            <div className="flex flex-col gap-3 border-t pt-4">
              {/* The clock is a default, not an answer. An organizer who
                  watched the member walk in on time can say so. */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${report.id}-status`}>{t("checkin:reports.recordThemAs")}</Label>
                <ToggleGroup
                  id={`${report.id}-status`}
                  value={[status]}
                  onValueChange={(next) =>
                    match(next[0])
                      .with(P.string, (picked) => setStatus(picked as RecordAs))
                      .otherwise(() => {})
                  }
                >
                  {A.map(RECORD_AS, (option) => (
                    <ToggleGroupItem key={option} value={option}>
                      {attendanceLabel(t, option)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <p className="text-muted-foreground text-xs">
                  {match(report.clockSays)
                    .with(P.string, (says) =>
                      t("checkin:reports.clockSays", {
                        status: attendanceLabel(t, says).toLowerCase(),
                      }),
                    )
                    .otherwise(() => t("checkin:reports.noClock"))}
                </p>
              </div>

              <Textarea
                aria-label={t("checkin:reports.noteLabel", { name: report.person.name })}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t("checkin:reports.notePlaceholder")}
              />

              <FormError error={decide.error} />

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({
                      id: report.id,
                      approve: true,
                      note: note.trim() || null,
                      status,
                    })
                  }
                >
                  <CheckCircleIcon />
                  {t("checkin:reports.recordAs", {
                    status: attendanceLabel(t, status).toLowerCase(),
                  })}
                </Button>
                <Button
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() =>
                    decide.mutate({ id: report.id, approve: false, note: note.trim() || null })
                  }
                >
                  <XCircleIcon />
                  {t("checkin:reports.decline")}
                </Button>
              </div>

              <p className="text-muted-foreground text-xs">{t("checkin:reports.afterHint")}</p>
            </div>
          ))
          .otherwise(() => (
            <div className="text-muted-foreground flex flex-col gap-1 border-t pt-4 text-sm">
              <p>
                {match(report.status)
                  .with("approved", () => t("checkin:reports.markedIn"))
                  .otherwise(() => t("checkin:reports.wasDeclined"))}
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
  const t = useTranslate();
  const [scope, setScope] = useQueryState(
    "status",
    parseAsStringLiteral(SCOPES).withDefault("pending"),
  );
  const reports = useCheckInReports(scope as ReportScope);
  const rows = reports.data ?? [];

  return (
    <>
      <PageHeader
        title={t("checkin:reports.title")}
        description={t("checkin:reports.description")}
      />

      <Tabs value={scope} onValueChange={(value) => void setScope(value as ReportScope)}>
        <TabsList>
          <TabsTrigger value="pending">{t("checkin:reports.waiting")}</TabsTrigger>
          <TabsTrigger value="decided">{t("checkin:reports.decided")}</TabsTrigger>
          <TabsTrigger value="all">{t("checkin:reports.all")}</TabsTrigger>
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
              <EmptyTitle>{t("checkin:reports.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("checkin:reports.emptyDescription")}</EmptyDescription>
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
export interface CheckInReportsPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /** The organization the address names, for every link this island writes. */
  orgSlug: string;
}

export function CheckInReportsPage(props: CheckInReportsPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <CheckInReportsBody />
    </Providers>
  );
}
