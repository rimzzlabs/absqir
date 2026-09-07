import { IDR, USD } from "dinero.js/bigint/currencies";
import { describe, expect, it } from "vitest";
import {
  formatMoney,
  fromMinorUnits,
  isMoreThan,
  isPositiveMoney,
  minus,
  money,
  plus,
  split,
  toMinorUnits,
  total,
  zero,
} from "@/money";

describe("money", () => {
  it("keeps amounts as bigint minor units", () => {
    const amount = money({ amount: 1234n, currency: USD });

    expect(toMinorUnits(amount)).toBe(1234n);
    expect(typeof toMinorUnits(amount)).toBe("bigint");
  });

  it("adds and subtracts without floating point drift", () => {
    const a = money({ amount: 10n, currency: USD });
    const b = money({ amount: 20n, currency: USD });

    expect(toMinorUnits(plus(a, b))).toBe(30n);
    expect(toMinorUnits(minus(b, a))).toBe(10n);
  });

  it("sums a list and returns zero for an empty list", () => {
    const amounts = [1234n, 866n, 1n].map((amount) => money({ amount, currency: USD }));

    expect(toMinorUnits(total(amounts, USD))).toBe(2101n);
    expect(toMinorUnits(total([], USD))).toBe(0n);
  });

  it("splits without losing a minor unit", () => {
    const shares = split(money({ amount: 1000n, currency: USD }), [1n, 1n, 1n]);
    const recovered = shares.map(toMinorUnits).reduce((sum, part) => sum + part, 0n);

    expect(shares.map(toMinorUnits)).toEqual([334n, 333n, 333n]);
    expect(recovered).toBe(1000n);
  });

  it("compares amounts", () => {
    const small = money({ amount: 1n, currency: USD });
    const large = money({ amount: 2n, currency: USD });

    expect(isMoreThan(large, small)).toBe(true);
    expect(isPositiveMoney(zero(USD))).toBe(false);
    expect(isPositiveMoney(small)).toBe(true);
  });

  it("round-trips through the database representation", () => {
    const stored = 999_999_999_999n;

    expect(toMinorUnits(fromMinorUnits(stored, USD))).toBe(stored);
  });

  it("formats using the currency exponent", () => {
    expect(formatMoney(money({ amount: 1234n, currency: USD }))).toBe("$12.34");
    expect(formatMoney(money({ amount: 5000n, currency: IDR }), "id-ID")).toContain("50");
  });
});
