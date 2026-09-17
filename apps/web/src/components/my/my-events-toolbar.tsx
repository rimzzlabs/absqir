import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@absqir/ui/tabs";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import { match } from "ts-pattern";
import { StickyToolbar } from "@/components/shared/sticky-toolbar";

export interface MyEventsToolbarProps {
  scope: string;
  onScopeChange: (value: string) => void;
  q: string;
  onQChange: (value: string) => void;
  /** True when at least one filter narrows the list. The tabs do not count. */
  filtered: boolean;
  onClear: () => void;
}

/**
 * The tabs and a title search above the list.
 *
 * No group filter: a member reads the events that expect them, and the
 * groups that put them there are not theirs to sort by.
 */
export function MyEventsToolbar(props: MyEventsToolbarProps) {
  const t = useTranslate();

  return (
    <StickyToolbar>
      <Tabs
        value={props.scope}
        onValueChange={(value) => props.onScopeChange(String(value))}
        className="w-full sm:w-auto"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="upcoming">{t("my:events.upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("my:events.past")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
        <InputGroup className="min-w-0 flex-1 sm:max-w-60">
          <InputGroupAddon>
            <MagnifyingGlassIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label={t("my:events.searchLabel")}
            placeholder={t("my:events.search")}
            value={props.q}
            onChange={(event) => props.onQChange(event.target.value)}
          />
        </InputGroup>

        {match(props.filtered)
          .with(true, () => (
            <Button variant="ghost" size="sm" className="shrink-0" onClick={props.onClear}>
              <XIcon />
              {t("my:events.clearFilters")}
            </Button>
          ))
          .otherwise(() => null)}
      </div>
    </StickyToolbar>
  );
}
