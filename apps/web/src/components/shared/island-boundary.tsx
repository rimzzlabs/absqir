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

    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>This part could not load</EmptyTitle>
          <EmptyDescription>
            The rest of the page still works. Try again, or reload the page.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          {import.meta.env.DEV ? (
            <p className="text-muted-foreground mb-3 font-mono text-xs break-all">
              {error.message}
            </p>
          ) : null}

          <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
            <ArrowClockwiseIcon />
            Try again
          </Button>
        </EmptyContent>
      </Empty>
    );
  }
}
