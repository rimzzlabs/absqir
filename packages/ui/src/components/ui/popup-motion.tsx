"use client";

import type { HTMLProps } from "@base-ui/react/types";
import {
  type HTMLMotionProps,
  motion,
  type Transition,
  useReducedMotionConfig,
} from "motion/react";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { match, P } from "ts-pattern";

/**
 * Every Base UI popup in this package animates through Motion instead of
 * CSS keyframes. The root hands Base UI an `actionsRef`, which stops Base UI
 * from unmounting a closed popup on its own. `MotionPopup` then calls
 * `unmount()` once the exit animation completes. Base UI's own check runs one
 * frame after close and Motion starts its Web Animation a frame later, so
 * without the ref some popups (Select, for one) vanish before the exit plays.
 *
 * The presets read `MotionConfig` first and the operating system's reduced
 * motion setting second, so they work with or without `MotionProvider`.
 */

/** Fast start, soft landing. The same curve as `Reveal`. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
} as const;

/** Added to the transition before the fallback unmount fires. */
const UNMOUNT_GRACE_MS = 60;

/** Base UI reports these when a transition would fight the interaction. */
const INSTANT_KINDS = new Set(["delay", "focus", "trigger-change", "group"]);

export type PopupSide =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "inline-start"
  | "inline-end"
  | "none";

export interface PopupMotionState {
  open: boolean;
  /** Where the popup sits relative to its anchor. Decides the slide direction. */
  side?: PopupSide;
  /** Set by Base UI when transitions must be skipped. */
  instant?: string | undefined;
}

export interface PopupMotionOptions {
  /** Distance in px the popup travels while it fades. Defaults to 8. */
  distance?: number;
  /** Explicit start offset. Overrides the side based default. */
  from?: { x?: number; y?: number };
  /** Start scale. 1 turns the zoom off. Defaults to 0.95. */
  scale?: number;
  /** Seconds. Defaults to `DURATION.base`. */
  duration?: number;
}

export interface PopupMotionProps {
  initial: HTMLMotionProps<"div">["initial"];
  animate: HTMLMotionProps<"div">["animate"];
  transition: Transition;
}

function slideOffset(side: PopupSide | undefined, distance: number) {
  switch (side) {
    case "top":
      return { x: 0, y: distance };
    case "bottom":
      return { x: 0, y: -distance };
    case "left":
    case "inline-start":
      return { x: distance, y: 0 };
    case "right":
    case "inline-end":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/** Fade, zoom and slide for anchored popups and dialogs. */
export function usePopupMotion(
  state: PopupMotionState,
  options: PopupMotionOptions = {},
): PopupMotionProps {
  const reduced = useReducedMotionConfig() ?? false;
  const { distance = 8, scale = 0.95, duration = DURATION.base } = options;
  const offset = match(options.from)
    .with(P.nullish, () => slideOffset(state.side, distance))
    .otherwise((from) => ({ x: from.x ?? 0, y: from.y ?? 0 }));
  const instant = state.instant !== undefined && INSTANT_KINDS.has(state.instant);
  const zoom = match(state.side)
    .with("none", () => 1)
    .otherwise(() => scale);

  const hidden = match(reduced)
    .with(true, () => ({ opacity: 0 }))
    .otherwise(() => ({ opacity: 0, scale: zoom, x: offset.x, y: offset.y }));
  const visible = match(reduced)
    .with(true, () => ({ opacity: 1 }))
    .otherwise(() => ({ opacity: 1, scale: 1, x: 0, y: 0 }));
  const moving = match(reduced)
    .with(true, () => DURATION.fast)
    .otherwise(() => duration);

  return {
    initial: hidden,
    animate: match(state.open)
      .with(true, () => visible)
      .otherwise(() => hidden),
    transition: {
      duration: match(instant)
        .with(true, () => 0)
        .otherwise(() => moving),
      ease: EASE_OUT,
    },
  };
}

/** Opacity only. Backdrops and anything that must not move. */
export function useFadeMotion(
  state: Pick<PopupMotionState, "open">,
  duration: number = DURATION.base,
): PopupMotionProps {
  const reduced = useReducedMotionConfig() ?? false;

  return {
    initial: { opacity: 0 },
    animate: {
      opacity: match(state.open)
        .with(true, () => 1)
        .otherwise(() => 0),
    },
    transition: {
      duration: match(reduced)
        .with(true, () => DURATION.fast)
        .otherwise(() => duration),
      ease: "linear",
    },
  };
}

/**
 * Base UI hands the render function plain DOM props. Motion owns a few of
 * those names for its own callbacks, so drop them before the spread.
 */
export function toMotionProps(props: HTMLProps): HTMLMotionProps<"div"> {
  const {
    onDrag: _onDrag,
    onDragStart: _onDragStart,
    onDragEnd: _onDragEnd,
    onAnimationStart: _onAnimationStart,
    onAnimationEnd: _onAnimationEnd,
    onAnimationIteration: _onAnimationIteration,
    ...rest
  } = props;

  return rest as HTMLMotionProps<"div">;
}

/** The part of a Base UI root's `actionsRef` that the exit animation needs. */
export interface PopupActions {
  unmount: () => void;
}

const PopupActionsContext = createContext<RefObject<PopupActions | null> | null>(null);

/**
 * Builds the ref to hand a Base UI root as `actionsRef`. When the consumer
 * passes a ref of their own, both refs see the same actions object.
 */
export function usePopupActionsRef<T extends PopupActions>(
  external?: RefObject<T | null>,
): RefObject<T | null> {
  return useMemo(() => {
    let value: T | null = null;

    return {
      get current() {
        return value;
      },
      set current(next: T | null) {
        value = next;
        if (external) external.current = next;
      },
    };
  }, [external]);
}

export interface PopupActionsProviderProps {
  /** Pass `null` to shield nested popups that manage their own lifetime. */
  actionsRef: RefObject<PopupActions | null> | null;
  children: ReactNode;
}

export function PopupActionsProvider({ actionsRef, children }: PopupActionsProviderProps) {
  return <PopupActionsContext.Provider value={actionsRef}>{children}</PopupActionsContext.Provider>;
}

/**
 * Unmounts the closed popup once its exit animation completes. Motion skips
 * the animation and its completion callback while the tab is hidden, so a
 * timer the length of the transition is the second line: without it a
 * dialog closed in a background tab would stay mounted, invisible, and eat
 * every click.
 */
function usePopupUnmount(open: boolean, durationSeconds: number) {
  const actions = useContext(PopupActionsContext);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (open) return;

    const timer = setTimeout(
      () => actions?.current?.unmount(),
      durationSeconds * 1000 + UNMOUNT_GRACE_MS,
    );

    return () => clearTimeout(timer);
  }, [open, durationSeconds, actions]);

  // A popup removed while closed, for example by a consumer's own condition,
  // must still release Base UI's mounted state.
  useEffect(
    () => () => {
      if (!openRef.current) actions?.current?.unmount();
    },
    [actions],
  );

  return () => {
    if (!openRef.current) actions?.current?.unmount();
  };
}

export interface MotionPopupProps extends HTMLProps {
  state: PopupMotionState;
  options?: PopupMotionOptions;
}

/**
 * Drop-in for a Base UI `render` function:
 * `render={(props, state) => <MotionPopup {...props} state={state} />}`
 */
export function MotionPopup({ state, options, ...props }: MotionPopupProps) {
  const preset = usePopupMotion(state, options);
  const duration = match(preset.transition.duration)
    .with(P.number, (duration) => duration)
    .otherwise(() => 0);
  const onAnimationComplete = usePopupUnmount(state.open, duration);

  return (
    <motion.div {...toMotionProps(props)} {...preset} onAnimationComplete={onAnimationComplete} />
  );
}

export interface MotionFadeProps extends HTMLProps {
  state: Pick<PopupMotionState, "open">;
  duration?: number;
}

/** The backdrop counterpart of `MotionPopup`. */
export function MotionFade({ state, duration, ...props }: MotionFadeProps) {
  const preset = useFadeMotion(state, duration);

  return <motion.div {...toMotionProps(props)} {...preset} />;
}
