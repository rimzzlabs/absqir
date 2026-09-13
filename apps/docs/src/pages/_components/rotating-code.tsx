"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";

/** The real window, in milliseconds. The panel keeps the product's own clock. */
const WINDOW_MS = 20_000;
const GRID = 11;

/** A small deterministic generator, so a window always draws the same field.
    The first paint must match on the server and on the client, so nothing here
    may read the wall clock or Math.random. */
function seeded(seed: number): () => number {
  let state = (seed * 1_664_525 + 1_013_904_223) >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0xffff_ffff;
  };
}

function modulesFor(seed: number): boolean[] {
  const next = seeded(seed + 7);
  return Array.from({ length: GRID * GRID }, () => next() > 0.46);
}

function tokenFor(seed: number): string {
  const next = seeded(seed + 991);
  let out = "";
  for (let i = 0; i < 10; i += 1) out += Math.floor(next() * 16).toString(16);
  return out;
}

export function RotatingCode() {
  const [seed, setSeed] = useState(0);
  const [remaining, setRemaining] = useState(WINDOW_MS);
  const [live, setLive] = useState(false);
  const started = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    setLive(true);
    started.current = Date.now();

    const id = window.setInterval(() => {
      // A hidden tab has nobody watching, so the clock waits rather than burns.
      if (document.visibilityState !== "visible") return;

      const elapsed = Date.now() - started.current;
      if (elapsed >= WINDOW_MS) {
        started.current = Date.now();
        setSeed((value) => value + 1);
        setRemaining(WINDOW_MS);
        return;
      }
      setRemaining(WINDOW_MS - elapsed);
    }, 250);

    return () => window.clearInterval(id);
  }, []);

  const modules = useMemo(() => modulesFor(seed), [seed]);
  // The accent has to land on a module that is actually drawn, or the window
  // arrives with nothing to show for it.
  const fresh = useMemo(() => {
    const on = modules.flatMap((drawn, index) =>
      match(drawn)
        .with(true, () => [index])
        .otherwise(() => []),
    );
    return on[(seed * 37 + 13) % on.length];
  }, [modules, seed]);
  const token = tokenFor(seed);
  const expired = tokenFor(seed - 1);
  const seconds = Math.ceil(remaining / 1000);

  return (
    <figure className="lp-screen" style={{ margin: 0 }}>
      <div className="lp-screen-head">
        <span className="lp-screen-title">Room screen</span>
        <span>
          {match(live)
            .with(true, () => `${seconds}s left`)
            .otherwise(() => "every 20s" as const)}
        </span>
      </div>

      <svg
        className="lp-modules"
        viewBox={`0 0 ${GRID * 10} ${GRID * 10}`}
        role="img"
        aria-label={`The code material for this window, token ${token}`}
      >
        {/* Exactly one module carries the accent: the one that arrived with this
            window. It is the brand mark's gesture, drawn while it happens. */}
        {modules.map((on, index) => {
          if (!on) return null;
          const x = (index % GRID) * 10;
          const y = Math.floor(index / GRID) * 10;
          const isFresh = index === fresh;
          return (
            <rect
              key={`${x},${y}`}
              x={x + 1}
              y={y + 1}
              width={8}
              height={8}
              rx={2}
              fill={match(isFresh)
                .with(true, () => "var(--lp-cobalt)")
                .otherwise(() => "var(--lp-ink)")}
              opacity={match(isFresh)
                .with(true, () => 1)
                .otherwise(() => 0.82)}
            />
          );
        })}
      </svg>

      <div className="lp-window">
        <span
          className="lp-window-fill"
          style={{
            transform: `scaleX(${match(live)
              .with(true, () => remaining / WINDOW_MS)
              .otherwise(() => 1 as const)})`,
          }}
        />
      </div>

      <div className="lp-tokens">
        <div className="lp-token-live">
          <span className="lp-token-tag">now </span>
          {token}
        </div>
        <div className="lp-token-dead">
          <span className="lp-token-tag">was </span>
          {expired}
        </div>
      </div>
    </figure>
  );
}
