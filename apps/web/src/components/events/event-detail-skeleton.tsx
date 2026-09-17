import { useTranslate } from "@absqir/i18n/react";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { BackLink } from "@/components/shared/back-link";
import { useOrgHref } from "@/lib/org-path";

/**
 * The page before the event arrives, in the shape the event will take.
 *
 * Every panel keeps its own border and its own place, so nothing moves when
 * the data lands. The way back is a real link from the first paint: it needs
 * no event to know where it goes.
 *
 * It mirrors `EventDetail`. A panel added there needs a bar added here.
 */
export function EventDetailSkeleton() {
  const t = useTranslate();
  const orgHref = useOrgHref();

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <BackLink href={orgHref("/events")}>{t("events:title")}</BackLink>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-7 w-24" />
            <Skeleton className="size-7" />
          </div>
        </div>
      </header>

      <div className="border-border flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-7 w-40 shrink-0" />
      </div>

      <div className="border-border rounded-xl border p-4">
        <Skeleton className="h-4 w-24" />
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-8 w-10" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <Skeleton className="mt-3 h-4 w-48" />
      </div>

      <section className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 rounded-lg" />
        <div className="flex flex-col gap-2">
          {A.map([0, 1, 2, 3, 4], (key) => (
            <Skeleton key={key} className="h-20 rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
