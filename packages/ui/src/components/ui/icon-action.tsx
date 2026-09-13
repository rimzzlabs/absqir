"use client";

import type * as React from "react";
import { Button } from "#src/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#src/components/ui/tooltip";

export interface IconActionProps extends Omit<React.ComponentProps<typeof Button>, "children"> {
  /** The words for the action. A screen reader hears them, a pointer sees them. */
  label: string;
  /** The icon alone. The label follows it, hidden. */
  children: React.ReactNode;
  /** Where the tooltip sits against the button. */
  side?: React.ComponentProps<typeof TooltipContent>["side"];
}

/**
 * A button that carries an icon and no visible text. An `aria-label` alone
 * reaches a screen reader and nobody else, so the label goes in a hidden span
 * and in a tooltip, and both readers get the same words.
 *
 * A menu or popover trigger does not belong here. Its own popup answers the
 * question a tooltip would, and two popups on one button fight for the press.
 */
function IconAction({ label, children, size = "icon-sm", side, ...props }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size={size} {...props} />}>
        {children}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { IconAction };
