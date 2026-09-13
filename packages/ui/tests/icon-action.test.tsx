import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { IconAction } from "#src/components/ui/icon-action";
import { TooltipProvider } from "#src/components/ui/tooltip";

function Icon() {
  return <svg aria-hidden="true" />;
}

function setup(node: ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("IconAction", () => {
  it("names the button for a screen reader", () => {
    setup(
      <IconAction label="Release example.com">
        <Icon />
      </IconAction>,
    );

    expect(screen.getByRole("button", { name: "Release example.com" })).toBeDefined();
  });

  it("keeps the label out of sight", () => {
    setup(
      <IconAction label="Cancel">
        <Icon />
      </IconAction>,
    );

    expect(screen.getByText("Cancel").className).toContain("sr-only");
  });

  // jsdom does not hover, so the open tooltip belongs to a real render. What
  // is worth holding here is that the button is a tooltip trigger at all, and
  // that the words reach the name once rather than twice.
  it("wires the button as the tooltip trigger", () => {
    setup(
      <IconAction label="Send again">
        <Icon />
      </IconAction>,
    );

    const button = screen.getByRole("button", { name: "Send again" });

    expect(button.dataset.slot).toBe("tooltip-trigger");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("says the label once, not twice", () => {
    setup(
      <IconAction label="Send again">
        <Icon />
      </IconAction>,
    );

    expect(screen.getAllByText("Send again")).toHaveLength(1);
  });

  it("does not fire while disabled", () => {
    const onClick = vi.fn();
    setup(
      <IconAction label="Remove" disabled onClick={onClick}>
        <Icon />
      </IconAction>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
