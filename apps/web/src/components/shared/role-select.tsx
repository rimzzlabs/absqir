import { useTranslate } from "@absqir/i18n/react";
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
  /** Only an owner grants the owner role. See canGrantOwner in core. */
  includeOwner?: boolean;
}

export function RoleSelect(props: RoleSelectProps) {
  const t = useTranslate();
  // Only an owner hands out the owner seat, so the option joins the list
  // for an owner and for nobody else.
  const options = match(Boolean(props.includeOwner))
    .with(true, () => [...ROLE_OPTIONS, "owner"] as const)
    .otherwise(() => ROLE_OPTIONS);

  return (
    <Select
      items={A.map(options, (option) => ({ value: option, label: t(`common:roles.${option}`) }))}
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
          <SelectLabel>{t("common:roleSelect.label")}</SelectLabel>
          {A.map(options, (option) => (
            <SelectItem key={option} value={option}>
              <span className="flex flex-col">
                <span>{t(`common:roles.${option}`)}</span>
                <SelectItemDescription>
                  {t(`common:roleSelect.hints.${option}`)}
                </SelectItemDescription>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
