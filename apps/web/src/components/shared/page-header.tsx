import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons that act on the whole page. */
  actions?: ReactNode;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{props.title}</h1>
        {props.description ? (
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? <div className="flex items-center gap-2">{props.actions}</div> : null}
    </header>
  );
}
