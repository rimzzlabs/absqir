import { A } from "@mobily/ts-belt";
import type { ReactNode } from "react";
import { match, P } from "ts-pattern";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#src/components/ui/table";

/**
 * Where a column goes on a card. A table row is one line across; a card has
 * to stack, so each column says which part of the card it belongs to.
 *
 * - `primary` heads the card. One column per table takes it.
 * - `action` sits in the top corner, with no label.
 * - `footer` runs along the bottom, full width, with no label.
 * - `field`, the default, becomes a labelled row.
 * - `none` stays in the table and off the card.
 */
export type ColumnPlace = "primary" | "action" | "footer" | "field" | "none";

export interface DataColumn<T> {
  /** Unique in the table. */
  key: string;
  /** The table heading, and the label on a card. */
  header?: ReactNode;
  cell: (row: T) => ReactNode;
  place?: ColumnPlace;
  headClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataColumn<T>[];
  rows: readonly T[];
  getKey: (row: T) => string;
  /** Names the table and the card list for a screen reader. */
  label: string;
  className?: string;
}

/**
 * The four parts of a card, from one column set. `primary` and `action` are
 * ts-belt options: a table with neither still renders.
 */
export interface CardParts<T> {
  primary: DataColumn<T> | null | undefined;
  action: DataColumn<T> | null | undefined;
  fields: readonly DataColumn<T>[];
  footer: readonly DataColumn<T>[];
}

export function placeOf<T>(column: DataColumn<T>): ColumnPlace {
  return column.place ?? "field";
}

/**
 * Sorts a column set into the parts of a card. The first `primary` and the
 * first `action` win, so a caller that marks two of either still gets a
 * card that reads.
 */
export function cardPartsOf<T>(columns: readonly DataColumn<T>[]): CardParts<T> {
  return {
    primary: A.find(columns, (column) => placeOf(column) === "primary"),
    action: A.find(columns, (column) => placeOf(column) === "action"),
    fields: A.filter(columns, (column) => placeOf(column) === "field"),
    footer: A.filter(columns, (column) => placeOf(column) === "footer"),
  };
}

function RowCard<T>(props: { columns: readonly DataColumn<T>[]; row: T }) {
  const { row } = props;
  const parts = cardPartsOf(props.columns);

  return (
    <li data-slot="data-card" className="rounded-xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 font-medium">
          {match(parts.primary)
            .with(P.nullish, () => null)
            .otherwise((column) => column.cell(row))}
        </div>
        {match(parts.action)
          .with(P.nullish, () => null)
          .otherwise((column) => (
            <div className="-mt-1 -mr-1 shrink-0">{column.cell(row)}</div>
          ))}
      </div>

      {match(parts.fields.length)
        .with(0, () => null)
        .otherwise(() => (
          <dl className="mt-3 space-y-2 border-t border-dashed pt-3">
            {A.map(parts.fields, (column) => (
              <div key={column.key} className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground text-xs">{column.header}</dt>
                <dd className="min-w-0 break-words text-right text-sm">{column.cell(row)}</dd>
              </div>
            ))}
          </dl>
        ))}

      {match(parts.footer.length)
        .with(0, () => null)
        .otherwise(() => (
          <div className="mt-3 space-y-2">
            {A.map(parts.footer, (column) => (
              <div key={column.key}>{column.cell(row)}</div>
            ))}
          </div>
        ))}
    </li>
  );
}

/**
 * One set of columns, drawn two ways. A table needs sideways room a phone
 * does not have, so below `md` every row becomes a card instead of a line
 * that scrolls off the screen. The swap is pure CSS, so the server and the
 * browser always agree on the markup.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  return (
    <div data-slot="data-table" className={props.className}>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {A.map(props.columns, (column) => (
                <TableHead key={column.key} className={column.headClassName}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {A.map(props.rows, (row) => (
              <TableRow key={props.getKey(row)}>
                {A.map(props.columns, (column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul aria-label={props.label} className="space-y-2.5 md:hidden">
        {A.map(props.rows, (row) => (
          <RowCard key={props.getKey(row)} columns={props.columns} row={row} />
        ))}
      </ul>
    </div>
  );
}
