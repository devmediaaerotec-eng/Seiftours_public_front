/**
 * Pure booking helpers: ISO dates (local time), date-range picking rules, rooms <-> URL.
 * No React and no imports, so `npm test` runs it directly with Node (booking.test.ts).
 */

/* ---------------------------------- Dates --------------------------------- */
// Dates are "YYYY-MM-DD" strings in local time: no timezone shifts, safe in URLs and APIs.

const pad = (n: number) => String(n).padStart(2, "0");

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

export const isISO = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(fromISO(s)) === s;

export const todayISO = () => toISO(new Date());

/* ------------------------------- Date ranges ------------------------------ */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface RangeRules {
  /** Minimum length: 1 for hotels (one night), 0 to allow same-day ranges */
  minNights?: number;
  /** Maximum length of the range */
  maxNights?: number;
}

export const MAX_NIGHTS = 30;

/**
 * What a click on `day` does to the current range:
 * 1st click = start, 2nd click = end; clicking before the start (or too close to it)
 * starts over from that day; a too-long range is cut to the maximum.
 */
export function pickDay(range: DateRange, day: string, rules: RangeRules = {}): DateRange {
  const { minNights = 1, maxNights = MAX_NIGHTS } = rules;
  const { from, to } = range;
  if (!from || to) return { from: day };
  const length = diffDays(from, day);
  if (length < minNights) return { from: day };
  return { from, to: length > maxNights ? addDays(from, maxNights) : day };
}

/** A half-picked range (start only) becomes start + minimum length (at least 1 day). */
export function completeRange(range: DateRange, rules: RangeRules = {}): DateRange {
  if (!range.from || range.to) return range;
  return { from: range.from, to: addDays(range.from, Math.max(1, rules.minNights ?? 1)) };
}

/* ---------------------------------- Rooms --------------------------------- */
export interface RoomConfig {
  adults: number;
  children: number;
  childrenAges: number[];
}

export const MAX_ROOMS = 5;
export const MAX_ADULTS = 10;
export const MAX_CHILDREN = 6;
export const MAX_CHILD_AGE = 17;

/** URL form: "2-5.8_1" = room 1: 2 adults + children aged 5 and 8; room 2: 1 adult. */
export function encodeRooms(rooms: RoomConfig[]): string {
  return rooms
    .map((r) => (r.childrenAges.length ? `${r.adults}-${r.childrenAges.join(".")}` : `${r.adults}`))
    .join("_");
}

/** Parses encodeRooms() output coming from the URL; null when it is not valid. */
export function decodeRooms(s: string | null | undefined): RoomConfig[] | null {
  if (!s) return null;
  const parts = s.split("_");
  if (parts.length > MAX_ROOMS || !parts.every((p) => /^\d+(-\d+(\.\d+)*)?$/.test(p))) return null;

  const rooms = parts.map((part) => {
    const [adults, kids = ""] = part.split("-");
    const ages = kids ? kids.split(".").map(Number) : [];
    return { adults: Number(adults), children: ages.length, childrenAges: ages };
  });

  const valid = rooms.every(
    (r) =>
      Number.isInteger(r.adults) &&
      r.adults >= 1 &&
      r.adults <= MAX_ADULTS &&
      r.children <= MAX_CHILDREN &&
      r.childrenAges.every((a) => Number.isInteger(a) && a >= 0 && a <= MAX_CHILD_AGE)
  );
  return valid ? rooms : null;
}
