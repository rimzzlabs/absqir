import { render, renderHook } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { match } from "ts-pattern";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MotionPopup,
  PopupActionsProvider,
  useFadeMotion,
  usePopupActionsRef,
  usePopupMotion,
} from "#src/components/ui/popup-motion";

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

/** Motion caches the OS setting once per process, so the config wins here. */
function ReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="always">{children}</MotionConfig>;
}

describe("usePopupMotion", () => {
  it("slides in from the anchor side", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => usePopupMotion({ open: true, side: "bottom" }));

    expect(result.current.initial).toEqual({ opacity: 0, scale: 0.95, x: 0, y: -8 });
    expect(result.current.animate).toEqual({ opacity: 1, scale: 1, x: 0, y: 0 });
  });

  it("returns to the hidden pose when the popup closes", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => usePopupMotion({ open: false, side: "left" }));

    expect(result.current.animate).toEqual({ opacity: 0, scale: 0.95, x: 8, y: 0 });
  });

  it("keeps a trigger aligned select from zooming", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => usePopupMotion({ open: true, side: "none" }));

    expect(result.current.initial).toEqual({ opacity: 0, scale: 1, x: 0, y: 0 });
  });

  it("only fades when the reader asks for less motion", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => usePopupMotion({ open: true, side: "top" }), {
      wrapper: ReducedMotion,
    });

    expect(result.current.initial).toEqual({ opacity: 0 });
    expect(result.current.animate).toEqual({ opacity: 1 });
    expect(result.current.transition.duration).toBeLessThan(0.18);
  });

  it("skips the transition when Base UI marks it instant", () => {
    setReducedMotion(false);
    const { result } = renderHook(() =>
      usePopupMotion({ open: true, side: "top", instant: "trigger-change" }),
    );

    expect(result.current.transition.duration).toBe(0);
  });

  it("does not treat a dismiss as instant", () => {
    setReducedMotion(false);
    const { result } = renderHook(() =>
      usePopupMotion({ open: false, side: "top", instant: "dismiss" }),
    );

    expect(result.current.transition.duration).toBeGreaterThan(0);
  });
});

describe("useFadeMotion", () => {
  it("never moves the element", () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useFadeMotion({ open: true }));

    expect(result.current.initial).toEqual({ opacity: 0 });
    expect(result.current.animate).toEqual({ opacity: 1 });
  });
});

describe("usePopupActionsRef", () => {
  it("mirrors the actions object into the consumer's ref", () => {
    const external = { current: null as { unmount: () => void } | null };
    const { result } = renderHook(() => usePopupActionsRef(external));
    const actions = { unmount: vi.fn() };

    result.current.current = actions;

    expect(result.current.current).toBe(actions);
    expect(external.current).toBe(actions);
  });
});

describe("MotionPopup", () => {
  it("releases Base UI when a closed popup leaves the tree", () => {
    setReducedMotion(false);
    const unmount = vi.fn();
    const actionsRef = { current: { unmount } };
    const view = render(
      <PopupActionsProvider actionsRef={actionsRef}>
        <MotionPopup state={{ open: false }} data-slot="popup">
          gone
        </MotionPopup>
      </PopupActionsProvider>,
    );

    view.unmount();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it("leaves Base UI alone while the popup is open", () => {
    setReducedMotion(false);
    const unmount = vi.fn();
    const actionsRef = { current: { unmount } };
    const view = render(
      <PopupActionsProvider actionsRef={actionsRef}>
        <MotionPopup state={{ open: true }}>visible</MotionPopup>
      </PopupActionsProvider>,
    );

    view.unmount();

    expect(unmount).not.toHaveBeenCalled();
  });
});
