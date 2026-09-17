import { describe, expect, it } from "vitest";
import { readAttendance } from "../src/attendance-counts";

const none = { expected: 3, present: 0, late: 0, excused: 0, absent: 0 };

describe("readAttendance", () => {
  it("counts the whole expected list as not yet before anything happens", () => {
    expect(readAttendance(none)).toEqual({ checkedIn: 0, recorded: 0, total: 3, notYet: 3 });
  });

  it("counts late arrivals as checked in", () => {
    const reading = readAttendance({ ...none, present: 1, late: 1 });

    expect(reading.checkedIn).toBe(2);
    expect(reading.notYet).toBe(1);
  });

  it("does not count an excused person as checked in", () => {
    const reading = readAttendance({ ...none, excused: 1 });

    expect(reading.checkedIn).toBe(0);
    expect(reading.recorded).toBe(1);
    expect(reading.notYet).toBe(2);
  });

  it("grows the roster past the expected list when walk-ins arrive", () => {
    const reading = readAttendance({ ...none, present: 5 });

    expect(reading.total).toBe(5);
    expect(reading.notYet).toBe(0);
  });

  it("reads an empty event without dividing anything by zero", () => {
    const reading = readAttendance({ expected: 0, present: 0, late: 0, excused: 0, absent: 0 });

    expect(reading).toEqual({ checkedIn: 0, recorded: 0, total: 0, notYet: 0 });
  });
});
