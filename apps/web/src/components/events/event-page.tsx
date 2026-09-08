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
import { type PublicEvent, useEvent } from "@/queries/use-event";

export interface EventPageProps {
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
      {event.seatsLeft === 0 ? " · full" : ""}
    </p>
  );
}

function Actions(props: EventPageProps & { event: PublicEvent }) {
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
        <a href="/my/sessions" className={buttonVariants({ className: "w-full" })}>
          My events
        </a>
        {event.status === "scheduled" ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate(event.id)}
          >
            {withdraw.isPending ? "Withdrawing…" : "Withdraw my registration"}
          </Button>
        ) : null}
        <FormError error={withdraw.error} />
      </Reveal>
    );
  }

  if (!event.open) {
    return (
      <p className="text-muted-foreground text-sm">
        {event.status === "done" ? "This event is over." : "Registration is closed."}
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
        {register.isPending ? "Registering…" : "Register"}
      </Button>
      <p className="text-muted-foreground text-sm">
        You join {event.organizationName} as a member, and this event expects you.
      </p>
      <FormError error={register.error} />
    </div>
  );
}

function EventBody(props: EventPageProps) {
  const event = useEvent(props.eventId);

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
        {data.description ? (
          <p className="text-muted-foreground text-sm whitespace-pre-line">{data.description}</p>
        ) : null}
        <Seats event={data} />
        <Actions {...props} event={data} />
      </div>
    ))
    .otherwise(() => null);
}

export function EventPage(props: EventPageProps) {
  return (
    <Providers>
      <EventBody {...props} />
    </Providers>
  );
}
