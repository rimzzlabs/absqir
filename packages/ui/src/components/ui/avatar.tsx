import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { A } from "@mobily/ts-belt";
import { cn } from "cn";
import type * as React from "react";
import { match, P } from "ts-pattern";

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg";
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      {...props}
    />
  );
}

/**
 * A stable hue from a name, so the same person always gets the same color.
 * The hash is the classic string hash; only the spread over 360 matters.
 */
export function hueOf(name: string): number {
  const hash = A.reduce(
    [...name.trim().toLowerCase()],
    0,
    (total, char) => (total * 31 + (char.codePointAt(0) ?? 0)) >>> 0,
  );

  return hash % 360;
}

/**
 * Fixed OKLCH lightness and chroma per theme, so every hue reads the same
 * and the letters keep a contrast above 7:1 on their circle.
 */
const TINTED =
  "bg-[oklch(0.92_0.07_var(--avatar-hue))] text-[oklch(0.38_0.13_var(--avatar-hue))] dark:bg-[oklch(0.32_0.09_var(--avatar-hue))] dark:text-[oklch(0.90_0.07_var(--avatar-hue))]";

function AvatarFallback({
  className,
  name,
  style,
  ...props
}: AvatarPrimitive.Fallback.Props & {
  /** Colors the circle from the name. Without it the circle is neutral. */
  name?: string;
}) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full text-sm font-medium group-data-[size=sm]/avatar:text-xs",
        match(name)
          .with(P.string.minLength(1), () => TINTED)
          .otherwise(() => "bg-muted text-muted-foreground" as const),
        className,
      )}
      style={match(name)
        .with(
          P.string.minLength(1),
          (name) => ({ ...style, "--avatar-hue": hueOf(name) }) as React.CSSProperties,
        )
        .otherwise(() => style)}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage };
