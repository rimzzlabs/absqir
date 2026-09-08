"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { LayoutGroup, motion } from "motion/react";
import { createContext, useContext, useId } from "react";

/** Which list a trigger belongs to, so its pill slides only inside that list. */
const TabsListContext = createContext<{ id: string; variant: "default" | "line" } | null>(null);

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const id = useId();

  return (
    <TabsListContext.Provider value={{ id, variant: variant ?? "default" }}>
      <LayoutGroup id={id}>
        <TabsPrimitive.List
          data-slot="tabs-list"
          data-variant={variant}
          className={cn(tabsListVariants({ variant }), className)}
          {...props}
        />
      </LayoutGroup>
    </TabsListContext.Provider>
  );
}

const PILL_TRANSITION = { type: "spring", stiffness: 500, damping: 40, mass: 0.6 } as const;

/**
 * The active marker: a raised pill in the default list, an underline in
 * the line list. One element per list moves between triggers with a
 * layout animation, which MotionConfig turns off for reduced motion.
 */
function ActiveMarker(props: { listId: string; variant: "default" | "line" }) {
  return (
    <motion.span
      layoutId={`${props.listId}-marker`}
      transition={PILL_TRANSITION}
      aria-hidden
      className={cn(
        "pointer-events-none absolute",
        props.variant === "default"
          ? "inset-0 rounded-md bg-background shadow-sm dark:border dark:border-input dark:bg-input/30"
          : "bg-foreground group-data-horizontal/tabs:inset-x-0 group-data-horizontal/tabs:bottom-[-5px] group-data-horizontal/tabs:h-0.5 group-data-vertical/tabs:inset-y-0 group-data-vertical/tabs:-right-1 group-data-vertical/tabs:w-0.5",
      )}
    />
  );
}

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  const list = useContext(TabsListContext);

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
      render={(renderProps, state) => (
        <button {...renderProps}>
          {state.active && list ? <ActiveMarker listId={list.id} variant={list.variant} /> : null}
          <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
        </button>
      )}
    />
  );
}

function TabsContent({ className, children, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    >
      {/* A panel mounts when its tab activates, so this is the entrance. */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Panel>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
