import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@absqir/ui/empty";
import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Component, type ReactNode } from "react";
import { match } from "ts-pattern";

export interface IslandBoundaryProps {
  children: ReactNode;
}

interface IslandBoundaryState {
  error: Error | null;
}

/**
 * Catches what a render or an effect throws, so one broken widget leaves the
 * rest of the page alive. Without it React unmounts the whole island and the
 * reader gets a blank frame with no way out.
 */
export class IslandBoundary extends Component<IslandBoundaryProps, IslandBoundaryState> {
  state: IslandBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): IslandBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[absqir] an island crashed", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return <IslandFallback error={error} onRetry={() => this.setState({ error: null })} />;
  }
}

/**
 * The words of the fallback, in a function component: a class cannot read
 * the language, and the boundary sits under the language provider anyway.
 */
function IslandFallback(props: { error: Error; onRetry: () => void }) {
  const t = useTranslate();

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WarningCircleIcon />
        </EmptyMedia>
        <EmptyTitle>{t("common:island.title")}</EmptyTitle>
        <EmptyDescription>{t("common:island.description")}</EmptyDescription>
      </EmptyHeader>

      <EmptyContent>
        {match(import.meta.env.DEV)
          .with(true, () => (
            <p className="text-muted-foreground mb-3 font-mono text-xs break-all">
              {props.error.message}
            </p>
          ))
          .otherwise(() => null)}

        <Button variant="outline" size="sm" onClick={props.onRetry}>
          <ArrowClockwiseIcon />
          {t("common:actions.tryAgain")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
