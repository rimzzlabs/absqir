import { Badge } from "@absqir/ui/badge";
import { A } from "@mobily/ts-belt";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";

export interface EventGroupRef {
  id: string;
  name: string;
}

export interface EventGroupsProps {
  groups: readonly EventGroupRef[];
  /** What the card says when the event names no group. */
  fallback: string;
}

/** The groups an event asks for, as badges. */
export function EventGroups(props: EventGroupsProps) {
  return match(props.groups.length > 0)
    .with(true, () => (
      <div className="flex flex-wrap gap-1">
        {A.map(props.groups, (group) => (
          <Badge key={group.id} variant="outline">
            {group.name}
          </Badge>
        ))}
      </div>
    ))
    .otherwise(() => (
      <p className="text-muted-foreground flex items-center gap-1 text-xs">
        <UsersThreeIcon aria-hidden />
        {props.fallback}
      </p>
    ));
}
