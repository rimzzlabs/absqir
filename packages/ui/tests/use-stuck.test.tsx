import { act, render, screen } from "@testing-library/react";
import { match } from "ts-pattern";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStuck } from "#src/hooks/use-stuck";

type Callback = (entries: { intersectionRatio: number }[]) => void;

const observers: { callback: Callback; options: IntersectionObserverInit }[] = [];

class FakeObserver {
  constructor(callback: Callback, options: IntersectionObserverInit) {
    observers.push({ callback, options });
  }
  observe() {}
  disconnect() {}
}

function Bar() {
  const { bar, stuck } = useStuck<HTMLDivElement>();

  return (
    <div ref={bar} style={{ position: "sticky", top: "56px" }}>
      {match(stuck)
        .with(true, () => "floating")
        .otherwise(() => "at rest")}
    </div>
  );
}

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe("useStuck", () => {
  it("starts at rest and floats once the bar is clipped", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Bar />);

    expect(screen.getByText("at rest")).toBeTruthy();

    act(() => observers[0]?.callback([{ intersectionRatio: 0.98 }]));
    expect(screen.getByText("floating")).toBeTruthy();

    act(() => observers[0]?.callback([{ intersectionRatio: 1 }]));
    expect(screen.getByText("at rest")).toBeTruthy();
  });

  it("trims the window to one pixel past where the bar rests", () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Bar />);

    expect(observers[0]?.options.rootMargin).toBe("-57px 0px 0px 0px");
    expect(observers[0]?.options.threshold).toEqual([1]);
  });

  it("stays at rest where no observer exists", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    expect(() => render(<Bar />)).not.toThrow();
    expect(screen.getByText("at rest")).toBeTruthy();
  });
});
