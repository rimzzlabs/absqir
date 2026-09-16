import { formatRange } from "@absqir/core/date";
import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { useOrgHref } from "@/lib/org-path";
import { useRegisterEvent } from "@/mutations/use-register-event";
import { useWithdrawEvent } from "@/mutations/use-withdraw-event";
import { type PublicEvent, usePublicEvent } from "@/queries/use-public-event";

export interface PublicEventPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  /**
   * The organization of the reader who is already a member, so the link out
   * lands on their own pages. Null for a stranger, whose link out is the
   * root, and the middleware takes it from there.
   */
  orgSlug?: string | null;
  eventId: string;
  signedIn: boolean;
}

function Seats(props: { event: PublicEvent }) {
  const { event } = props;
  const t = useTranslate();

  if (event.limit === null) {
    return (
      <p className="text-muted-foreground text-sm tabular-nums">
        {t("publicEvent:registered", { count: event.registered })}
      </p>
    );
  }

  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      {t("publicEvent:seats", {
        registered: event.registered,
        limit: event.limit,
      })}
      {match(event.seatsLeft)
        .with(0, () => t("publicEvent:full"))
        .otherwise(() => "" as const)}
    </p>
  );
}

function Actions(props: PublicEventPageProps & { event: PublicEvent }) {
  const { event } = props;
  const t = useTranslate();
  const orgHref = useOrgHref();
  const register = useRegisterEvent();
  const withdraw = useWithdrawEvent();

  if (event.mine) {
    return (
      <Reveal className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircleIcon weight="fill" className="size-5 text-emerald-500" />
          {t("publicEvent:youAreRegistered")}
        </div>
        <p className="text-muted-foreground text-sm">{t("publicEvent:youAreRegisteredHint")}</p>
        <a href={orgHref("/my/events")} className={buttonVariants({ className: "w-full" })}>
          {t("publicEvent:myEvents")}
        </a>
        {match(event.status)
          .with("scheduled", () => (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={withdraw.isPending}
              onClick={() => withdraw.mutate(event.id)}
            >
              {match(withdraw.isPending)
                .with(true, () => t("publicEvent:withdrawing"))
                .otherwise(() => t("publicEvent:withdraw"))}
            </Button>
          ))
          .otherwise(() => null)}
        <FormError error={withdraw.error} />
      </Reveal>
    );
  }

  if (!event.open) {
    return (
      <p className="text-muted-foreground text-sm">
        {match(event.status)
          .with("done", () => t("publicEvent:over"))
          .otherwise(() => t("publicEvent:closed"))}
      </p>
    );
  }

  if (event.seatsLeft === 0) {
    return <p className="text-muted-foreground text-sm">{t("publicEvent:soldOut")}</p>;
  }

  if (!props.signedIn) {
    const next = encodeURIComponent(`/e/${event.id}`);
    const query = `next=${next}&event=${encodeURIComponent(event.id)}`;

    return (
      <div className="space-y-3">
        <a href={`/sign-in?${query}`} className={buttonVariants({ className: "w-full" })}>
          {t("publicEvent:signIn")}
        </a>
        <p className="text-muted-foreground text-sm">{t("publicEvent:signInHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="w-full"
        disabled={register.isPending}
        onClick={() => register.mutate(event.id)}
      >
        {match(register.isPending)
          .with(true, () => t("publicEvent:registering"))
          .otherwise(() => t("publicEvent:register"))}
      </Button>
      <p className="text-muted-foreground text-sm">
        {t("publicEvent:joinNote", { organization: event.organizationName })}
      </p>
      <FormError error={register.error} />
    </div>
  );
}

function PublicEventBody(props: PublicEventPageProps) {
  const t = useTranslate();
  const event = usePublicEvent(props.eventId);

  return match(event)
    .with({ isPending: true }, () => (
      <p className="text-muted-foreground text-sm">{t("common:actions.loading")}</p>
    ))
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-5">
        <AuthHeading
          title={t("publicEvent:brokenTitle")}
          description={t("publicEvent:brokenDescription")}
        />
        <FormError error={error} />
      </div>
    ))
    .with({ data: P.select(P.nonNullable) }, (data) => (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{data.organizationName}</p>
          <AuthHeading
            title={data.title}
            description={formatRange(new Date(data.startsAt), new Date(data.endsAt))}
          />
        </div>
        {match(data.description)
          .with(P.string.minLength(1), (description) => (
            <p className="text-muted-foreground text-sm whitespace-pre-line">{description}</p>
          ))
          .otherwise(() => null)}
        <Seats event={data} />
        <Actions {...props} event={data} />
      </div>
    ))
    .otherwise(() => null);
}

export function PublicEventPage(props: PublicEventPageProps) {
  return (
    <Providers locale={props.locale} orgSlug={props.orgSlug}>
      <PublicEventBody {...props} />
    </Providers>
  );
}
