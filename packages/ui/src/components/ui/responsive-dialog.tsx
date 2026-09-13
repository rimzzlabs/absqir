"use client";

import { cn } from "cn";
import * as React from "react";
import { match } from "ts-pattern";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#src/components/ui/dialog";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#src/components/ui/drawer";
import { useIsMobile } from "#src/hooks/use-mobile";

/**
 * True below `md`, where every part renders its drawer counterpart. The base-ui
 * dialog and drawer props are not interchangeable, so each part takes the plain
 * DOM subset that both accept.
 */
const DrawerModeContext = React.createContext<boolean | null>(null);

function useDrawerMode() {
  const mode = React.useContext(DrawerModeContext);

  if (mode === null) {
    throw new Error("A ResponsiveDialog part must be used within a ResponsiveDialog.");
  }

  return mode;
}

export interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  /** The drawer shows a grab bar. Turn it off when swiping away would lose work. */
  showSwipeHandle?: boolean;
  children?: React.ReactNode;
}

/**
 * One popup that reads as a dialog on a wide screen and as a drawer on a
 * narrow one. A form with more than two fields needs this: a centred dialog on
 * a phone leaves no room for the keyboard, while a drawer starts at the thumb.
 *
 * The parts take the same shape as the dialog parts, so a call site swaps the
 * imports and keeps its markup:
 *
 * ```tsx
 * <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *   <ResponsiveDialogContent className="sm:max-w-lg">
 *     <ResponsiveDialogHeader>
 *       <ResponsiveDialogTitle>New event</ResponsiveDialogTitle>
 *     </ResponsiveDialogHeader>
 *     <form className="flex min-h-0 flex-1 flex-col gap-4">
 *       <ResponsiveDialogBody>…</ResponsiveDialogBody>
 *       <ResponsiveDialogFooter>…</ResponsiveDialogFooter>
 *     </form>
 *   </ResponsiveDialogContent>
 * </ResponsiveDialog>
 * ```
 */
function ResponsiveDialog({ showSwipeHandle = true, children, ...props }: ResponsiveDialogProps) {
  const drawer = useIsMobile();

  return (
    <DrawerModeContext.Provider value={drawer}>
      {match(drawer)
        .with(true, () => (
          <Drawer showSwipeHandle={showSwipeHandle} {...props}>
            {children}
          </Drawer>
        ))
        .otherwise(() => (
          <Dialog {...props}>{children}</Dialog>
        ))}
    </DrawerModeContext.Provider>
  );
}

function ResponsiveDialogTrigger(props: React.ComponentProps<"button">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerTrigger {...props} />)
    .otherwise(() => <DialogTrigger {...props} />);
}

export interface ResponsiveDialogContentProps {
  /** Width and other dialog-only classes. The drawer spans the screen width. */
  className?: string;
  /** Classes for the drawer alone. */
  drawerClassName?: string;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

function ResponsiveDialogContent({
  className,
  drawerClassName,
  showCloseButton = true,
  ...props
}: ResponsiveDialogContentProps) {
  const drawer = useDrawerMode();

  // `className` carries a dialog width such as `sm:max-w-lg`. The drawer is
  // anchored to both edges, so that width would pull it off centre.
  if (drawer) return <DrawerContent className={drawerClassName} {...props} />;

  return <DialogContent className={className} showCloseButton={showCloseButton} {...props} />;
}

function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerHeader {...props} />)
    .otherwise(() => <DialogHeader {...props} />);
}

function ResponsiveDialogBody(props: React.ComponentProps<"div">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerBody {...props} />)
    .otherwise(() => <DialogBody {...props} />);
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  const drawer = useDrawerMode();

  // The drawer keeps its padded footer instead of the dialog's pinned bar, but
  // the button order matches: the action the reader wants sits on top.
  if (drawer) return <DrawerFooter className={cn("flex-col-reverse", className)} {...props} />;

  return <DialogFooter className={className} {...props} />;
}

function ResponsiveDialogTitle(props: React.ComponentProps<"h2">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerTitle {...props} />)
    .otherwise(() => <DialogTitle {...props} />);
}

function ResponsiveDialogDescription(props: React.ComponentProps<"p">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerDescription {...props} />)
    .otherwise(() => <DialogDescription {...props} />);
}

function ResponsiveDialogClose(props: React.ComponentProps<"button">) {
  const drawer = useDrawerMode();

  return match(drawer)
    .with(true, () => <DrawerClose {...props} />)
    .otherwise(() => <DialogClose {...props} />);
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
