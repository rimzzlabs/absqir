import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#src/components/ui/dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "#src/components/ui/responsive-dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#src/components/ui/sheet";

/** jsdom draws nothing, so the classes are the contract under test. */
function classesOf(slot: string) {
  const element = document.querySelector(`[data-slot="${slot}"]`);
  if (!element) throw new Error(`No element with data-slot="${slot}".`);

  return element.className.split(" ");
}

/** `useIsMobile` reads both the media query and the width. jsdom has neither. */
function setViewportWidth(width: number) {
  window.innerWidth = width;
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: width < 768,
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
  window.innerWidth = 1024;
});

function TallDialog() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New event</DialogTitle>
        </DialogHeader>
        <form className="flex min-h-0 flex-1 flex-col gap-4">
          <DialogBody>
            <p>A field</p>
          </DialogBody>
          <DialogFooter>
            <button type="submit">Save</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

describe("DialogBody", () => {
  it("caps the popup at the viewport instead of letting it grow", () => {
    render(<TallDialog />);

    const popup = classesOf("dialog-content");

    expect(popup).toContain("max-h-[calc(100dvh-2rem)]");
    expect(popup).toContain("flex-col");
    expect(popup).not.toContain("overflow-y-auto");
  });

  it("puts the only scroll region on the body", () => {
    render(<TallDialog />);

    const body = classesOf("dialog-body");

    expect(body).toContain("overflow-y-auto");
    expect(body).toContain("min-h-0");
    expect(body).toContain("flex-1");
  });

  it("holds the header and the footer still while the body scrolls", () => {
    render(<TallDialog />);

    expect(classesOf("dialog-header")).toContain("shrink-0");
    expect(classesOf("dialog-footer")).toContain("shrink-0");
  });

  it("keeps the close button outside the scroll region", () => {
    render(<TallDialog />);

    const body = document.querySelector('[data-slot="dialog-body"]');
    const close = screen.getByRole("button", { name: "Close" });

    expect(body?.contains(close)).toBe(false);
  });
});

describe("SheetBody", () => {
  it("scrolls the middle and pins the rest", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Monday</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <p>An entry</p>
          </SheetBody>
          <SheetFooter>
            <button type="button">New event</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    expect(classesOf("sheet-body")).toContain("overflow-y-auto");
    expect(classesOf("sheet-header")).toContain("shrink-0");
    expect(classesOf("sheet-footer")).toContain("shrink-0");
  });
});

function Responsive() {
  return (
    <ResponsiveDialog open>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New group</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <p>A field</p>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

describe("ResponsiveDialog", () => {
  it("is a centred dialog on a wide screen", () => {
    setViewportWidth(1024);
    render(<Responsive />);

    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeNull();
  });

  it("is a drawer on a narrow screen", () => {
    setViewportWidth(420);
    render(<Responsive />);

    expect(document.querySelector('[data-slot="drawer-popup"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull();
  });

  it("keeps the dialog width off the drawer, which spans both edges", () => {
    setViewportWidth(420);
    render(<Responsive />);

    expect(classesOf("drawer-popup")).not.toContain("sm:max-w-lg");
  });
});
