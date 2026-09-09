import * as clack from "@clack/prompts";
import pc from "picocolors";
import { CancelError, UsageError } from "@/lib/errors";

/**
 * Rich mode draws clack boxes and colour. Plain mode writes one fact per line,
 * which is what a pipe, a CI job, and NO_COLOR need. The mode is settled once,
 * at load: a command that changes mode halfway prints two different reports.
 */
const rich =
  Boolean(process.stdin.isTTY) &&
  Boolean(process.stdout.isTTY) &&
  !process.env.CI &&
  !process.env.NO_COLOR;

export function isRich(): boolean {
  return rich;
}

export function intro(title: string): void {
  if (rich) {
    clack.intro(pc.inverse(pc.cyan(` ${title} `)));
    return;
  }

  console.log(title);
}

export function outro(message: string): void {
  if (rich) {
    clack.outro(message);
    return;
  }

  console.log(message);
}

export function outroError(message: string): void {
  if (rich) {
    clack.outro(pc.red(message));
    return;
  }

  console.error(message);
}

export function cancelled(): void {
  if (rich) {
    clack.cancel("Cancelled. Nothing was written.");
    return;
  }

  console.error("Cancelled. Nothing was written.");
}

export function info(message: string): void {
  if (rich) {
    clack.log.info(message);
    return;
  }

  console.log(message);
}

export function success(message: string): void {
  if (rich) {
    clack.log.success(pc.green(message));
    return;
  }

  console.log(message);
}

export function warn(message: string): void {
  if (rich) {
    clack.log.warn(pc.yellow(message));
    return;
  }

  console.log(message);
}

export function fail(message: string): void {
  if (rich) {
    clack.log.error(pc.red(message));
    return;
  }

  console.error(message);
}

/** Writes to stdout untouched, for output another program will read. */
export function raw(message: string): void {
  console.log(message);
}

export interface NoteParams {
  title: string;
  lines: string[];
}

export function note(params: NoteParams): void {
  if (rich) {
    clack.note(params.lines.join("\n"), params.title);
    return;
  }

  console.log("");
  console.log(params.title);
  for (const line of params.lines) console.log(`  ${line}`);
}

export interface CheckParams {
  ok: boolean;
  label: string;
  hint?: string;
}

/** One result line of `absqir doctor`, with its hint under a failure. */
export function check(params: CheckParams): void {
  if (rich) {
    if (params.ok) {
      clack.log.success(params.label);
      return;
    }

    clack.log.error(pc.red(params.label));
    if (params.hint) clack.log.message(pc.dim(params.hint));
    return;
  }

  console.log(`${params.ok ? "ok  " : "FAIL"}  ${params.label}`);
  if (!params.ok && params.hint) console.log(`      ${params.hint}`);
}

export interface SpinParams<T> {
  start: string;
  stop: string;
  task: () => Promise<T>;
}

export async function spin<T>(params: SpinParams<T>): Promise<T> {
  if (!rich) {
    console.log(params.start);
    return params.task();
  }

  const spinner = clack.spinner();
  spinner.start(params.start);

  try {
    return await params.task();
  } finally {
    spinner.stop(params.stop);
  }
}

interface AskParams<T> {
  flag: string;
  run: () => Promise<T | symbol>;
}

/**
 * Every prompt goes through here. Outside a terminal there is nobody to
 * answer, so the command names the flag that carries the same value.
 */
async function ask<T>(params: AskParams<T>): Promise<T> {
  if (!rich) throw new UsageError(`Nothing to prompt on. Pass ${params.flag}.`);

  const value = await params.run();

  if (clack.isCancel(value)) throw new CancelError();

  return value as T;
}

export interface TextParams {
  message: string;
  flag: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string | undefined) => string | undefined;
}

export function text(params: TextParams): Promise<string> {
  return ask({
    flag: params.flag,
    run: () =>
      clack.text({
        message: params.message,
        placeholder: params.placeholder,
        defaultValue: params.defaultValue,
        validate: params.validate,
      }),
  });
}

export interface PasswordParams {
  message: string;
  flag: string;
  validate?: (value: string | undefined) => string | undefined;
}

export function password(params: PasswordParams): Promise<string> {
  return ask({
    flag: params.flag,
    run: () => clack.password({ message: params.message, validate: params.validate }),
  });
}

export interface ConfirmParams {
  message: string;
  flag: string;
  initialValue?: boolean;
}

export function confirm(params: ConfirmParams): Promise<boolean> {
  return ask({
    flag: params.flag,
    run: () => clack.confirm({ message: params.message, initialValue: params.initialValue }),
  });
}

export interface Choice<Value extends string> {
  value: Value;
  label: string;
  hint?: string;
}

export interface SelectParams<Value extends string> {
  message: string;
  flag: string;
  options: Choice<Value>[];
  initialValue?: Value;
}

export function select<Value extends string>(params: SelectParams<Value>): Promise<Value> {
  // clack types its options through a conditional on the value type, which
  // TypeScript cannot resolve while `Value` is still generic. The prompt is
  // driven with plain strings, and the narrow union comes back on the way out.
  return ask<Value>({
    flag: params.flag,
    run: () =>
      clack.select<string>({
        message: params.message,
        options: params.options,
        initialValue: params.initialValue,
      }) as Promise<Value | symbol>,
  });
}

export interface MultiselectParams<Value extends string> {
  message: string;
  flag: string;
  options: Choice<Value>[];
}

export function multiselect<Value extends string>(
  params: MultiselectParams<Value>,
): Promise<Value[]> {
  return ask<Value[]>({
    flag: params.flag,
    run: () =>
      clack.multiselect<string>({
        message: params.message,
        options: params.options,
        required: false,
      }) as Promise<Value[] | symbol>,
  });
}
