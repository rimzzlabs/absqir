import { Checkbox } from "@absqir/ui/checkbox";
import { Label } from "@absqir/ui/label";
import { Skeleton } from "@absqir/ui/skeleton";
import { FormError } from "@/components/shared/form-error";
import { useGroups } from "@/queries/use-groups";

export interface GroupPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

/** A checklist of the organization's groups. Everyone in a ticked group is expected. */
export function GroupPicker(props: GroupPickerProps) {
  const groups = useGroups();

  if (groups.isPending) return <Skeleton className="h-16 rounded-lg" />;
  if (groups.isError) return <FormError error={groups.error} />;

  if (groups.data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No groups yet. Create one on the Groups page, then come back.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean) => {
    props.onChange(
      checked ? [...new Set([...props.value, id])] : props.value.filter((value) => value !== id),
    );
  };

  return (
    <ul className="border-border divide-border max-h-48 divide-y overflow-y-auto rounded-lg border">
      {groups.data.map((group) => (
        <li key={group.id} className="flex items-center gap-3 px-3 py-2">
          <Checkbox
            id={`group-${group.id}`}
            checked={props.value.includes(group.id)}
            disabled={props.disabled}
            onCheckedChange={(value) => toggle(group.id, value === true)}
          />
          <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer font-normal">
            <span>{group.name}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {group.memberCount} {group.memberCount === 1 ? "person" : "people"}
            </span>
          </Label>
        </li>
      ))}
    </ul>
  );
}
