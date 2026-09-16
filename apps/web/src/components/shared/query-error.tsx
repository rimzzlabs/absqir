import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@absqir/ui/empty";
import { cn } from "@absqir/ui/lib/utils";
import { A } from "@mobily/ts-belt";
import { ArrowClockwiseIcon, CloudWarningIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";

/** The part of a TanStack query this component reads. */
export interface FailedRead {
  error: Error | null;
  isFetching: boolean;
  refetch: () => unknown;
}

export interface QueryErrorProps {
  /**
   * The read that failed. Pass every query the region needs, and one press
   * runs all of them again.
   */
  query: FailedRead | FailedRead[];
}

/**
 * A read that failed, standing where its list or its card should be.
 *
 * FormError answers a mutation under the form that caused it, and the reader
 * still has that form to try again with. A failed read leaves an empty
 * region behind, so this one carries the way out with it.
 *
 * The message is the heading. Every sentence in the errors namespace already
 * names what did not load, so a line above it would only say it twice.
 */
export function QueryError(props: QueryErrorProps) {
  const t = useTranslate();

  const reads = match(props.query)
    .with(P.array(), (list) => list)
    .otherwise((one) => [one]);

  const error = A.find(reads, (read) => Boolean(read.error))?.error;
  if (!error) return null;

  const retrying = A.some(reads, (read) => read.isFetching);

  return (
    <Empty role="alert" className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CloudWarningIcon />
        </EmptyMedia>
        <EmptyTitle>{error.message}</EmptyTitle>
      </EmptyHeader>

      <EmptyContent>
        <Button
          variant="outline"
          size="sm"
          disabled={retrying}
          onClick={() => A.forEach(reads, (read) => read.refetch())}
        >
          <ArrowClockwiseIcon className={cn(retrying && "animate-spin")} />
          {match(retrying)
            .with(true, () => t("common:actions.loading"))
            .otherwise(() => t("common:actions.tryAgain"))}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
