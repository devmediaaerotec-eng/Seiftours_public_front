/**
 * The agencies where a visitor can finalise an "agency" booking.
 * No imports: used by the browser AND by api/bookings.ts.
 *
 * ⚠️ PLACEHOLDER VALUES: replace the address, phone and opening hours of each agency
 * by the real ones before going live (everything marked [À COMPLÉTER]).
 */
export type BranchId = "sousse" | "jemmal";

/** ["08:30", "17:30"] = open between these hours; null = closed that day */
export type Slot = [open: string, close: string] | null;

export interface Branch {
  id: BranchId;
  city: string;
  name: string;
  address: string;
  phone: string;
  /** Optional: a Google Maps link. If empty, a search link is built from the address. */
  mapsUrl?: string;
  /** Index = JS getDay(): 0 Sunday ... 6 Saturday */
  hours: Record<number, Slot>;
}

// [À COMPLÉTER] real opening hours (these are only an example)
const EXAMPLE_HOURS: Record<number, Slot> = {
  0: null,
  1: ["08:30", "17:30"],
  2: ["08:30", "17:30"],
  3: ["08:30", "17:30"],
  4: ["08:30", "17:30"],
  5: ["08:30", "17:30"],
  6: ["08:30", "13:00"],
};

export const BRANCHES: Branch[] = [
  {
    id: "sousse",
    city: "Sousse",
    name: "Agence de Sousse",
    address: "[À COMPLÉTER] Adresse de l'agence de Sousse",
    phone: "", // [À COMPLÉTER]
    hours: EXAMPLE_HOURS,
  },
  {
    id: "jemmal",
    city: "Jemmal",
    name: "Agence de Jemmal",
    address: "[À COMPLÉTER] Adresse de l'agence de Jemmal",
    phone: "", // [À COMPLÉTER]
    hours: EXAMPLE_HOURS,
  },
];

export const isBranchId = (v: unknown): v is BranchId => BRANCHES.some((b) => b.id === v);
export const getBranch = (id?: string | null) => BRANCHES.find((b) => b.id === id);

export const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Current day and minutes in Tunisia (a visitor abroad must still see the agency's local time). */
export function tunisNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const pretty = (hhmm: string) => hhmm.replace(":", "h");

/** "Ouverte aujourd'hui jusqu'à 17h30" / "Ouvre aujourd'hui à 08h30" / "Fermée aujourd'hui" */
export function openStatus(branch: Branch): { open: boolean; text: string } {
  const { day, minutes } = tunisNow();
  const slot = branch.hours[day];
  if (!slot) return { open: false, text: "Fermée aujourd'hui" };
  if (minutes < toMinutes(slot[0])) return { open: false, text: `Ouvre aujourd'hui à ${pretty(slot[0])}` };
  if (minutes < toMinutes(slot[1])) return { open: true, text: `Ouverte aujourd'hui jusqu'à ${pretty(slot[1])}` };
  return { open: false, text: "Fermée pour aujourd'hui" };
}

export const hoursLabel = (slot: Slot) => (slot ? `${pretty(slot[0])} - ${pretty(slot[1])}` : "Fermée");

export const directionsUrl = (b: Branch) =>
  b.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address}`)}`;
