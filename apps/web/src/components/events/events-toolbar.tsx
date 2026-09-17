import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { A } from "@mobily/ts-belt";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { StickyToolbar } from "@/components/shared/sticky-toolbar";
import { useGroups } from "@/queries/use-groups";

export interface EventsToolbarProps {
  scope: string;
  onScopeChange: (value: string) => void;
  q: string;
  onQChange: (value: string) => void;
  groupId: string;
  onGroupChange: (value: string) => void;
  /** True when at least one filter narrows the list. The tabs do not count. */
  filtered: boolean;
  onClear: () => void;
}

/** The empty string stands for every group; the URL then carries no `group`. */
const EVERY_GROUP = "";

/** The tabs, a title search and a group, above the list. */
export function EventsToolbar(props: EventsToolbarProps) {
  const t = useTranslate();
  const groups = useGroups();
  const rows = groups.data ?? [];

  return (
    <StickyToolbar className="justify-between">
      <Tabs value={props.scope} onValueChange={(value) => props.onScopeChange(String(value))}>
        <TabsList>
          <TabsTrigger value="upcoming">{t("events:upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("events:past")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        <InputGroup className="w-full sm:w-60">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={t("events:searchLabel")}
            placeholder={t("events:search")}
            value={props.q}
            onChange={(event) => props.onQChange(event.target.value)}
          />
        </InputGroup>

        <Select
          items={[
            { value: EVERY_GROUP, label: t("events:everyGroup") },
            ...A.map(rows, (group) => ({ value: group.id, label: group.name })),
          ]}
          value={props.groupId}
          onValueChange={(value) => {
            if (typeof value === "string") props.onGroupChange(value);
          }}
        >
          <SelectTrigger aria-label={t("events:filterByGroup")} className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={EVERY_GROUP}>{t("events:everyGroup")}</SelectItem>
            </SelectGroup>
            {match(rows.length > 0)
              .with(true, () => (
                <SelectGroup>
                  <SelectLabel>{t("events:groupsLabel")}</SelectLabel>
                  {A.map(rows, (group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
              .otherwise(() => null)}
          </SelectContent>
        </Select>

        {match(props.filtered)
          .with(true, () => (
            <Button variant="ghost" size="sm" onClick={props.onClear}>
              <XIcon />
              {t("events:clearFilters")}
            </Button>
          ))
          .otherwise(() => null)}
      </div>
    </StickyToolbar>
  );
}
