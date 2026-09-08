import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useGroups } from "@/queries/use-groups";

export interface SessionsToolbarProps {
  q: string;
  onQChange: (value: string) => void;
  groupId: string;
  onGroupChange: (value: string) => void;
}

/** The empty string stands for every group; the URL then carries no `group`. */
const EVERY_GROUP = "";

/** A title search and a group filter above the grid. */
export function SessionsToolbar(props: SessionsToolbarProps) {
  const groups = useGroups();
  const rows = groups.data ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="w-full sm:w-72">
        <InputGroupAddon>
          <MagnifyingGlassIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search events by title"
          placeholder="Search by title"
          value={props.q}
          onChange={(event) => props.onQChange(event.target.value)}
        />
      </InputGroup>

      <Select
        items={[
          { value: EVERY_GROUP, label: "Every group" },
          ...rows.map((group) => ({ value: group.id, label: group.name })),
        ]}
        value={props.groupId}
        onValueChange={(value) => {
          if (typeof value === "string") props.onGroupChange(value);
        }}
      >
        <SelectTrigger aria-label="Filter by group" className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={EVERY_GROUP}>Every group</SelectItem>
          </SelectGroup>
          {rows.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Groups</SelectLabel>
              {rows.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
    </div>
  );
}
