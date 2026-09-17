import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback } from "@absqir/ui/avatar";
import { Badge } from "@absqir/ui/badge";
import { Button } from "@absqir/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { cn } from "@absqir/ui/lib/utils";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { MagnifyingGlassIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useDeferredValue, useState } from "react";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { initialsOf } from "@/lib/avatar";
import type { MyEventDetail } from "@/queries/use-my";
import { useMyRoster } from "@/queries/use-my";

export interface MyEventRosterProps {
  event: MyEventDetail;
  className?: string;
}

/**
 * Who else is expected. Names and one head count, nothing per person: what
 * each of them did stays between them and the organizer.
 *
 * The search runs on the server, so a name further down the list than the
 * page reaches is still findable. The old hard cap is gone with it.
 */
export function MyEventRoster(props: MyEventRosterProps) {
  const { event } = props;
  const t = useTranslate();
  const [q, setQ] = useState("");
  // The list follows the typing a beat behind, so every keystroke does not fetch.
  const wanted = useDeferredValue(q.trim());
  const roster = useMyRoster(event.id, wanted);
  const pages = roster.data?.pages ?? [];
  const rows = A.flatMap(pages, (page) => page.items);
  const expectedTotal = A.head(pages)?.expectedTotal ?? event.expectedTotal;
  const meId = A.head(pages)?.meId ?? null;
  const searching = wanted !== "";
  const refetching = roster.isFetching && !roster.isFetchingNextPage;

  const checkedIn = match(event.expectedTotal)
    .with(0, () => 0 as const)
    .otherwise((total) => Math.round((event.checkedInCount / total) * 100));

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersThreeIcon />
          {t("my:event.roster")}
        </CardTitle>
        <CardDescription>
          {match(event.status)
            .with("scheduled", () => t("my:event.expected", { count: event.expectedTotal }))
            .otherwise(() =>
              t("my:event.checkedIn", {
                checkedIn: event.checkedInCount,
                expected: event.expectedTotal,
              }),
            )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {match(event.status)
          .with("scheduled", () => null)
          .otherwise(() => (
            <div
              role="progressbar"
              aria-label={t("my:event.progressLabel")}
              aria-valuenow={event.checkedInCount}
              aria-valuemin={0}
              aria-valuemax={event.expectedTotal}
              className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            >
              <span
                className="bg-primary block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${checkedIn}%` }}
              />
            </div>
          ))}

        {/* The search earns its place only once the list is long enough to
            need one. Below that, every name is already on screen. */}
        {match(expectedTotal > 8)
          .with(true, () => (
            <InputGroup>
              <InputGroupAddon>
                <MagnifyingGlassIcon aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label={t("my:event.searchLabel")}
                placeholder={t("my:event.search")}
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </InputGroup>
          ))
          .otherwise(() => null)}

        {match(roster)
          .with({ isPending: true }, () => (
            <div className="space-y-2" aria-busy>
              {A.map([0, 1, 2, 3], (key) => (
                <Skeleton key={key} className="h-8 rounded-lg" />
              ))}
            </div>
          ))
          .with({ isError: true, error: P.select() }, (error) => <FormError error={error} />)
          .otherwise(() => (
            <div
              aria-busy={refetching}
              className={cn(
                "space-y-4 transition-opacity",
                match(refetching)
                  .with(true, () => "opacity-60" as const)
                  .otherwise(() => "" as const),
              )}
            >
              {match(rows.length)
                .with(0, () => (
                  <p className="text-muted-foreground text-sm">
                    {match(searching)
                      .with(true, () => t("my:event.noMatch"))
                      .otherwise(() => t("my:event.nobodyElse"))}
                  </p>
                ))
                .otherwise(() => (
                  <ul className="space-y-2" aria-label={t("my:event.roster")}>
                    {A.map(rows, (person) => (
                      <li key={person.id} className="flex min-w-0 items-center gap-2.5">
                        <Avatar size="sm">
                          <AvatarFallback name={person.name}>
                            {initialsOf(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{person.name}</span>
                        {match(person.id === meId)
                          .with(true, () => (
                            <Badge variant="secondary" className="shrink-0">
                              {t("my:event.you")}
                            </Badge>
                          ))
                          .otherwise(() => null)}
                      </li>
                    ))}
                  </ul>
                ))}

              {match(roster.hasNextPage)
                .with(true, () => (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={roster.isFetchingNextPage}
                    onClick={() => void roster.fetchNextPage()}
                  >
                    {match(roster.isFetchingNextPage)
                      .with(true, () => t("common:actions.loading"))
                      .otherwise(() => t("my:event.loadMore"))}
                  </Button>
                ))
                .otherwise(() => null)}
            </div>
          ))}

        <p className="text-muted-foreground border-t pt-3 text-xs">{t("my:event.headCountOnly")}</p>
      </CardContent>
    </Card>
  );
}
