export {};

// ts-belt returns readonly arrays, and that is the point: a collection this
// code produced is not something a later caller edits in place. Keep the
// default. Where a third-party signature demands a mutable array (Drizzle's
// .values(), Recharts payloads), spread at that call and nowhere else.
declare global {
  namespace Belt {
    type UseMutableArrays = 0;
  }
}
