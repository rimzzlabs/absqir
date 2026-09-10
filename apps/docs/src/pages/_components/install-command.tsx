"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

interface Runner {
  id: string;
  runner: string;
  rest: string;
}

const RUNNERS = [
  { id: "npm", runner: "npx", rest: "absqir@latest init my-absqir" },
  { id: "pnpm", runner: "pnpm dlx", rest: "absqir@latest init my-absqir" },
  { id: "bun", runner: "bunx", rest: "absqir@latest init my-absqir" },
] as const satisfies readonly Runner[];

/** The command people actually type to install absqir, with the runners they
    actually use. It is not terminal decoration, so it has no window chrome and
    no prompt: it is a real line with a copy button that works. */
export function InstallCommand() {
  const listId = useId();
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const said = useRef<number | undefined>(undefined);
  // `move` keeps `active` inside the list, so the fallback never runs. It is here
  // because a number index proves nothing to the type checker.
  const current = RUNNERS[active] ?? RUNNERS[0];

  useEffect(() => () => window.clearTimeout(said.current), []);

  const move = useCallback((next: number) => {
    const index = (next + RUNNERS.length) % RUNNERS.length;
    setActive(index);
    tabs.current[index]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight") move(active + 1);
      else if (event.key === "ArrowLeft") move(active - 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(RUNNERS.length - 1);
      else return;
      event.preventDefault();
    },
    [active, move],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${current.runner} ${current.rest}`);
      setCopied(true);
      window.clearTimeout(said.current);
      said.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // A browser can refuse the clipboard. Say nothing rather than claim success.
      setCopied(false);
    }
  }, [current]);

  return (
    <div className="lp-install">
      <div
        className="lp-install-tabs"
        role="tablist"
        aria-label="Package runner"
        onKeyDown={onKeyDown}
      >
        {RUNNERS.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${listId}-tab-${item.id}`}
            aria-selected={index === active}
            aria-controls={`${listId}-panel`}
            tabIndex={index === active ? 0 : -1}
            className="lp-tab"
            onClick={() => setActive(index)}
          >
            {item.id}
          </button>
        ))}
      </div>
      <div
        className="lp-install-body"
        role="tabpanel"
        id={`${listId}-panel`}
        aria-labelledby={`${listId}-tab-${current.id}`}
      >
        <code className="lp-cmd">
          <span className="lp-cmd-runner">{current.runner}</span> {current.rest}
        </code>
        {/* The button stays in place through the copy, so a keyboard user keeps
            their focus and the row keeps its width. */}
        <button
          type="button"
          className="lp-copy"
          data-copied={copied}
          onClick={copy}
          aria-label="Copy the command"
        >
          {copied ? (
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true" fill="none">
              <path
                d="M3.5 8L6.25 10.75L11.5 4.75"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true" fill="none">
              <rect x="4.75" y="4.75" width="7.5" height="7.5" rx="1.75" stroke="currentColor" />
              <path
                d="M9.5 2.75H4.5A1.75 1.75 0 0 0 2.75 4.5v5"
                stroke="currentColor"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
        <span className="lp-sr" role="status">
          {copied ? "Command copied" : ""}
        </span>
      </div>
    </div>
  );
}
