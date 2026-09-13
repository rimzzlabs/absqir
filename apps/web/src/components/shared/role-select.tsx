import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@absqir/ui/select";
import { A } from "@mobily/ts-belt";
import { match } from "ts-pattern";
import { type InvitableRole, ROLE_OPTIONS } from "@/lib/directory-schemas";

export interface RoleSelectProps {
  id?: string;
  value: InvitableRole;
  onChange: (value: InvitableRole) => void;
  disabled?: boolean;
  /** Owner can only be granted by an owner, and only from the members table. */
  includeOwner?: boolean;
}

const OWNER = { value: "owner", label: "Owner", hint: "Everything, including deleting the org." };

export function RoleSelect(props: RoleSelectProps) {
  const options = match(Boolean(props.includeOwner))
    .with(true, () => [...ROLE_OPTIONS, OWNER])
    .otherwise(() => [...ROLE_OPTIONS]);

  return (
    <Select
      items={A.map(options, (option) => ({ value: option.value, label: option.label }))}
      value={props.value}
      disabled={props.disabled}
      onValueChange={(value) => {
        if (value) props.onChange(value as InvitableRole);
      }}
    >
      <SelectTrigger id={props.id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Role</SelectLabel>
          {A.map(options, (option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex flex-col">
                <span>{option.label}</span>
                <SelectItemDescription>{option.hint}</SelectItemDescription>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
