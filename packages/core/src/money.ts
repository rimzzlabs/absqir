import { A } from "@mobily/ts-belt";
import {
  add,
  allocate,
  type Dinero,
  type DineroCurrency,
  dinero,
  greaterThan,
  isNegative,
  isZero,
  subtract,
  toDecimal,
  toSnapshot,
} from "dinero.js/bigint";

/**
 * Money is a bigint-backed Dinero value. Postgres holds the same integer in a
 * `bigint` column, so no float ever touches an amount.
 */
export type Money = Dinero<bigint>;
export type MoneyCurrency = DineroCurrency<bigint>;

export interface MoneyInput {
  /** Minor units. 1234n in USD is $12.34. */
  amount: bigint;
  currency: MoneyCurrency;
}

export function money(input: MoneyInput): Money {
  return dinero({ amount: input.amount, currency: input.currency });
}

export function zero(currency: MoneyCurrency): Money {
  return dinero({ amount: 0n, currency });
}

/** The value to write into a Postgres `bigint` column. */
export function toMinorUnits(value: Money): bigint {
  return toSnapshot(value).amount;
}

export function fromMinorUnits(amount: bigint, currency: MoneyCurrency): Money {
  return dinero({ amount, currency });
}

export function plus(left: Money, right: Money): Money {
  return add(left, right);
}

export function minus(left: Money, right: Money): Money {
  return subtract(left, right);
}

/**
 * Adds a list of amounts. Every entry must share the currency of `currency`.
 * Aggregation like this belongs on the server, never in a component.
 */
export function total(amounts: readonly Money[], currency: MoneyCurrency): Money {
  return A.reduce([...amounts], zero(currency), (sum, amount) => add(sum, amount));
}

/**
 * Splits an amount into shares without losing a minor unit to rounding.
 * Ratios are bigint because the calculator behind Money is bigint.
 */
export function split(value: Money, ratios: readonly bigint[]): Money[] {
  return allocate(value, [...ratios]);
}

export function isPositiveMoney(value: Money): boolean {
  return !isNegative(value) && !isZero(value);
}

export function isMoreThan(left: Money, right: Money): boolean {
  return greaterThan(left, right);
}

export function formatMoney(value: Money, locale = "en-US"): string {
  return toDecimal(value, (snapshot) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: snapshot.currency.code,
    }).format(Number(snapshot.value)),
  );
}
