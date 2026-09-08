"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "cn";

function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>,
) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("truncate", className)}
      {...props}
    />
  );
}

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-fit items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:bg-input/50 data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon data-slot="select-icon" className="text-muted-foreground">
        <CaretUpDownIcon className="size-3.5" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "sideOffset" | "alignItemWithTrigger">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50 outline-none"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-[min(24rem,var(--available-height))] min-w-(--anchor-width) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "grid cursor-default grid-cols-[1fr_auto] items-center gap-2 rounded-md py-1.5 pr-2 pl-2.5 outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText data-slot="select-item-text" className="truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator data-slot="select-item-indicator">
        <CheckIcon className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectGroup({ ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectGroupLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-group-label"
      className={cn("px-2.5 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
