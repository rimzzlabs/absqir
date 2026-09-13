import { render, screen } from "@testing-library/react";
import { match } from "ts-pattern";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "#src/components/reveal";

function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: match(query.includes("prefers-reduced-motion"))
        .with(true, () => reduced)
        .otherwise(() => false as const),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Reveal", () => {
  it("renders its children", () => {
    setReducedMotion(false);
    render(<Reveal>visible content</Reveal>);

    expect(screen.getByText("visible content")).toBeDefined();
  });

  it("still shows the content when the reader asks for less motion", () => {
    setReducedMotion(true);
    render(<Reveal>reduced content</Reveal>);

    expect(screen.getByText("reduced content")).toBeDefined();
  });

  it("keeps the class name it is given", () => {
    setReducedMotion(false);
    const { container } = render(<Reveal className="border">boxed</Reveal>);

    expect(container.firstElementChild?.className).toContain("border");
  });
});
