import { Badge } from "@absqir/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@absqir/ui/empty";
import {
  BellIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  NotePencilIcon,
  QrCodeIcon,
  RepeatIcon,
} from "@phosphor-icons/react";

/** Named, not passed as elements: an Astro page cannot hand React a JSX child. */
const ICONS = {
  sessions: QrCodeIcon,
  calendar: CalendarBlankIcon,
  schedules: RepeatIcon,
  leave: NotePencilIcon,
  reports: ChartBarIcon,
  notifications: BellIcon,
  history: ClockCounterClockwiseIcon,
} as const;

export type EmptyModuleIcon = keyof typeof ICONS;

export interface EmptyModuleProps {
  icon: EmptyModuleIcon;
  title: string;
  description: string;
  /** Which build phase delivers this module. */
  phase: 2 | 3 | 4;
  /** What the module will hold once it exists. */
  bullets: string[];
}

const PHASE_LABELS: Record<EmptyModuleProps["phase"], string> = {
  2: "Phase 2: sessions and attendance",
  3: "Phase 3: registration and leave",
  4: "Phase 4: reports and notifications",
};

/**
 * A module that exists in the plan but not yet in the product. It says so
 * instead of pretending with a spinner or a fake table.
 */
export function EmptyModule(props: EmptyModuleProps) {
  const Icon = ICONS[props.icon];

  return (
    <Empty className="border-border rounded-xl border border-dashed py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{props.title}</EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Badge variant="outline">{PHASE_LABELS[props.phase]}</Badge>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-left text-sm">
          {props.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </EmptyContent>
    </Empty>
  );
}
