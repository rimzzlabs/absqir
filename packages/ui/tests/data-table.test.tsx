import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  cardCellOf,
  cardPartsOf,
  type DataColumn,
  DataTable,
  placeOf,
} from "#src/components/ui/data-table";

interface Row {
  id: string;
  name: string;
  email: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
  { id: "2", name: "Grace Hopper", email: "grace@example.com" },
];

const COLUMNS: DataColumn<Row>[] = [
  { key: "name", header: "Name", place: "primary", cell: (row) => row.name },
  { key: "email", header: "Email", cell: (row) => row.email },
  {
    key: "remove",
    place: "action",
    cell: (row) => <button type="button">Remove {row.name}</button>,
  },
  { key: "decide", place: "footer", cell: () => <button type="button">Approve</button> },
  { key: "internal", header: "Internal", place: "none", cell: () => "hidden on a card" },
];

describe("placeOf", () => {
  it("treats a column with no place as a labelled field", () => {
    expect(placeOf({ key: "email", cell: () => null })).toBe("field");
  });

  it("keeps the place a column asks for", () => {
    expect(placeOf({ key: "name", place: "primary", cell: () => null })).toBe("primary");
  });
});

describe("cardPartsOf", () => {
  it("sorts a column set into the parts of a card", () => {
    const parts = cardPartsOf(COLUMNS);

    expect(parts.primary?.key).toBe("name");
    expect(parts.action?.key).toBe("remove");
    expect(parts.fields.map((column) => column.key)).toEqual(["email"]);
    expect(parts.footer.map((column) => column.key)).toEqual(["decide"]);
  });

  it("takes the first of two primary columns", () => {
    const parts = cardPartsOf<Row>([
      { key: "a", place: "primary", cell: () => null },
      { key: "b", place: "primary", cell: () => null },
    ]);

    expect(parts.primary?.key).toBe("a");
  });

  it("returns no primary and no action when nothing claims them", () => {
    const parts = cardPartsOf<Row>([{ key: "email", cell: () => null }]);

    expect(parts.primary).toBeUndefined();
    expect(parts.action).toBeUndefined();
    expect(parts.fields).toHaveLength(1);
  });
});

describe("cardCellOf", () => {
  it("falls back to the table cell", () => {
    const column: DataColumn<Row> = { key: "name", cell: (row) => row.name };

    expect(cardCellOf(column, ROWS[0] as Row)).toBe("Ada Lovelace");
  });

  it("prefers the card body when the column has one", () => {
    const column: DataColumn<Row> = {
      key: "name",
      cell: (row) => row.name,
      card: (row) => row.email,
    };

    expect(cardCellOf(column, ROWS[0] as Row)).toBe("ada@example.com");
  });
});

describe("DataTable", () => {
  it("draws every column in the table", () => {
    render(<DataTable label="People" columns={COLUMNS} rows={ROWS} getKey={(row) => row.id} />);

    const table = screen.getByRole("table");

    expect(within(table).getByText("Name")).toBeDefined();
    expect(within(table).getByText("Internal")).toBeDefined();
    expect(within(table).getAllByText("hidden on a card")).toHaveLength(2);
  });

  it("draws one card per row, named for a screen reader", () => {
    render(<DataTable label="People" columns={COLUMNS} rows={ROWS} getKey={(row) => row.id} />);

    const list = screen.getByRole("list", { name: "People" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps a `none` column off the cards", () => {
    render(<DataTable label="People" columns={COLUMNS} rows={ROWS} getKey={(row) => row.id} />);

    const list = screen.getByRole("list", { name: "People" });

    expect(within(list).queryByText("hidden on a card")).toBeNull();
  });

  it("labels a field on a card and leaves the action bare", () => {
    render(<DataTable label="People" columns={COLUMNS} rows={ROWS} getKey={(row) => row.id} />);

    const card = within(screen.getByRole("list", { name: "People" })).getAllByRole("listitem")[0];

    expect(card).toBeDefined();
    expect(within(card as HTMLElement).getByText("Email")).toBeDefined();
    expect(within(card as HTMLElement).getByText("ada@example.com")).toBeDefined();
    expect(
      within(card as HTMLElement).getByRole("button", { name: "Remove Ada Lovelace" }),
    ).toBeDefined();
    expect(within(card as HTMLElement).getByRole("button", { name: "Approve" })).toBeDefined();
  });

  it("gives the card its own body when a column asks for one", () => {
    const columns: DataColumn<Row>[] = [
      { key: "name", header: "Name", place: "primary", cell: (row) => row.name },
      {
        key: "actions",
        place: "action",
        cell: () => <button type="button">Wide control</button>,
        card: () => <button type="button">Folded away</button>,
      },
    ];

    render(<DataTable label="People" columns={columns} rows={ROWS} getKey={(row) => row.id} />);

    const table = screen.getByRole("table");
    const list = screen.getByRole("list", { name: "People" });

    expect(within(table).getAllByRole("button", { name: "Wide control" })).toHaveLength(2);
    expect(within(table).queryByRole("button", { name: "Folded away" })).toBeNull();
    expect(within(list).getAllByRole("button", { name: "Folded away" })).toHaveLength(2);
    expect(within(list).queryByRole("button", { name: "Wide control" })).toBeNull();
  });

  it("draws nothing but the headings for an empty row set", () => {
    render(<DataTable label="People" columns={COLUMNS} rows={[]} getKey={(row) => row.id} />);

    expect(screen.getByRole("table")).toBeDefined();
    expect(
      within(screen.getByRole("list", { name: "People" })).queryAllByRole("listitem"),
    ).toHaveLength(0);
  });
});
