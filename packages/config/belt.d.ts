export {};

// ts-belt returns readonly arrays by default. Drizzle's .values() and several
// of our own row types want a mutable array, and ts-belt always builds a fresh
// array at runtime, so the readonly marker buys nothing here and would force a
// copy at every boundary. This switch is types only: no runtime change.
declare global {
  namespace Belt {
    type UseMutableArrays = 1;
  }
}
