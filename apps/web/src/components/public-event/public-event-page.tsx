import { formatRange } from "@absqir/core/date";
import { Button, buttonVariants } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Providers } from "@/components/providers";
import { FormError } from "@/components/shared/form-error";
import { useRegisterEvent } from "@/mutations/use-register-event";
import { useWithdrawEvent } from "@/mutations/use-withdraw-event";
import { type PublicEvent, usePublicEvent } from "@/queries/use-public-event";

export interface PublicEventPageProps {
  eventId: string;
  signedIn: boolean;
}

function Seats(props: { event: PublicEvent }) {
  const { event } = props;

  if (event.limit === null) {
    return (
      <p className="text-muted-foreground text-sm tabular-nums">{event.registered} registered</p>
    );
  }

  return (
    <p className="text-muted-foreground text-sm tabular-nums">
      {event.registered} of {event.limit} seats taken
      {match(event.seatsLeft)
        .with(0, () => " · full" as const)
        .otherwise(() => "" as const)}
    </p>
  );
}

function Actions(props: PublicEventPageProps & { event: PublicEvent }) {
  const { event } = props;
  const register = useRegisterEvent();
  const withdraw = useWithdrawEvent();

  if (event.mine) {
    return (
      <Reveal className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircleIcon weight="fill" className="size-5 text-emerald-500" />
          You are registered
        </div>
        <p className="text-muted-foreground text-sm">
          When the event runs, scan the screen in the room, or show your pass at the door.
        </p>
        <a href="/my/events" className={buttonVariants({ className: "w-full" })}>
          My events
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
                .with(true, () => "Withdrawing…" as const)
                .otherwise(() => "Withdraw my registration" as const)}
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
          .with("done", () => "This event is over." as const)
          .otherwise(() => "Registration is closed." as const)}
      </p>
    );
  }

  if (event.seatsLeft === 0) {
    return <p className="text-muted-foreground text-sm">Every seat is taken.</p>;
  }

  if (!props.signedIn) {
    const next = encodeURIComponent(`/e/${event.id}`);
    const query = `next=${next}&event=${encodeURIComponent(event.id)}`;

    return (
      <div className="space-y-3">
        <a href={`/sign-in?${query}`} className={buttonVariants({ className: "w-full" })}>
          Sign in to register
        </a>
        <p className="text-muted-foreground text-sm">
          No account yet? The same door creates one with a code sent to your email.
        </p>
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
          .with(true, () => "Registering…" as const)
          .otherwise(() => "Register" as const)}
      </Button>
      <p className="text-muted-foreground text-sm">
        You join {event.organizationName} as a member, and this event expects you.
      </p>
      <FormError error={register.error} />
    </div>
  );
}

function PublicEventBody(props: PublicEventPageProps) {
  const event = usePublicEvent(props.eventId);

  return match(event)
    .with({ isPending: true }, () => <p className="text-muted-foreground text-sm">Loading…</p>)
    .with({ isError: true, error: P.select() }, (error) => (
      <div className="space-y-5">
        <AuthHeading
          title="Nothing to register for"
          description="This link does not point to an open event. Ask the organizer for a fresh one."
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
    <Providers>
      <PublicEventBody {...props} />
    </Providers>
  );
}
