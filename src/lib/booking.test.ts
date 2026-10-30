// Run with: npm test (Node >= 22.18 runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  completeRange,
  decodeRooms,
  diffDays,
  encodeRooms,
  isISO,
  pickDay,
} from "./booking.ts";

test("date helpers cross month and year ends", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(diffDays("2026-10-30", "2026-11-02"), 3);
  assert.equal(isISO("2026-02-30"), false);
  assert.equal(isISO("2026-10-15"), true);
});

test("pickDay: first click starts, second click ends", () => {
  const start = pickDay({}, "2026-10-16");
  assert.deepEqual(start, { from: "2026-10-16" });
  assert.deepEqual(pickDay(start, "2026-10-18"), { from: "2026-10-16", to: "2026-10-18" });
});

test("pickDay: clicking before or on the start starts over (hotels need 1 night)", () => {
  assert.deepEqual(pickDay({ from: "2026-10-16" }, "2026-10-12"), { from: "2026-10-12" });
  assert.deepEqual(pickDay({ from: "2026-10-16" }, "2026-10-16"), { from: "2026-10-16" });
});

test("pickDay: same-day range allowed when minNights is 0", () => {
  assert.deepEqual(pickDay({ from: "2026-10-16" }, "2026-10-16", { minNights: 0 }), {
    from: "2026-10-16",
    to: "2026-10-16",
  });
});

test("pickDay: a full range restarts on the next click", () => {
  assert.deepEqual(pickDay({ from: "2026-10-16", to: "2026-10-18" }, "2026-10-20"), {
    from: "2026-10-20",
  });
});

test("pickDay: too-long stays are cut to the maximum", () => {
  assert.deepEqual(pickDay({ from: "2026-10-01" }, "2026-12-01", { maxNights: 30 }), {
    from: "2026-10-01",
    to: "2026-10-31",
  });
});

test("completeRange fills a missing end with the minimum stay", () => {
  assert.deepEqual(completeRange({ from: "2026-10-16" }), { from: "2026-10-16", to: "2026-10-17" });
  assert.deepEqual(completeRange({ from: "2026-10-16" }, { minNights: 0 }), {
    from: "2026-10-16",
    to: "2026-10-17",
  });
  assert.deepEqual(completeRange({}), {});
});

test("rooms survive a round trip through the URL", () => {
  const rooms = [
    { adults: 2, children: 2, childrenAges: [5, 8] },
    { adults: 1, children: 0, childrenAges: [] },
  ];
  assert.equal(encodeRooms(rooms), "2-5.8_1");
  assert.deepEqual(decodeRooms(encodeRooms(rooms)), rooms);
});

test("decodeRooms rejects invalid or hostile values", () => {
  for (const bad of ["", "0", "2-18", "11", "2-1.2.3.4.5.6.7", "1_1_1_1_1_1", "2-x", "<script>", "2--3"]) {
    assert.equal(decodeRooms(bad), null, bad);
  }
  assert.equal(decodeRooms(null), null);
});
