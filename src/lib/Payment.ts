/**
 * Pricing and payment rules shown in the interface.
 * They come from the API (GET /api/public/booking-config: markup_rules + settings tables) and the
 * SERVER applies exactly the same formulas when the booking is made (HotelPricing.php):
 * it re-checks the price with MyGo and refuses the booking if it no longer matches.
 */
export interface PricingConfig {
  markup: { percent: number; fixedPerNight: number }; // agency margin on the supplier price
  deposit: { rate: number; min: number }; // online deposit: max(min, total × rate), capped at total
  offerTtlMinutes: number;
  paymentAvailable: boolean; // false = only "pay at the agency" can be offered
  currency: string;
}

/** Used until the API answers (same values as the database defaults). */
export const DEFAULT_PRICING: PricingConfig = {
  markup: { percent: 15, fixedPerNight: 0 },
  deposit: { rate: 0.15, min: 30 },
  offerTtlMinutes: 10,
  paymentAvailable: false, // online payment is switched off for now (HOTEL_ONLINE_PAYMENT_ENABLED on the server)
  currency: "TND",
};

/** request = reservation request without payment (default) · deposit = online deposit (kept for later) · agency = legacy */
export type BookingMode = "request" | "agency" | "deposit";

export interface Amounts {
  total: number;
  deposit: number; // paid online now ("deposit" mode)
  remaining: number; // paid at the hotel after an online deposit
  currency: string;
}

/** Customer price (whole TND) for a supplier price covering `nights` nights. Same formula as the server. */
export function withMarkup(supplierPrice: number, nights: number, markup = DEFAULT_PRICING.markup): number {
  return Math.round(supplierPrice * (1 + markup.percent / 100) + markup.fixedPerNight * nights);
}

/** Per-night customer price, for display only (cards, "from … / night"). */
export function perNightWithMarkup(supplierPerNight: number, markup = DEFAULT_PRICING.markup): number {
  return supplierPerNight * (1 + markup.percent / 100) + markup.fixedPerNight;
}

export function depositFor(total: number, rules = DEFAULT_PRICING.deposit): number {
  if (!(total > 0)) return 0;
  const raw = Math.max(rules.min, Math.round(total * rules.rate));
  return Math.min(raw, Math.round(total));
}

export function amountsFor(total: number, rules = DEFAULT_PRICING.deposit, currency = DEFAULT_PRICING.currency): Amounts {
  const t = Math.round(total);
  const deposit = depositFor(t, rules);
  return { total: t, deposit, remaining: Math.max(0, t - deposit), currency };
}

/* -------------------------------------------------------------------------- */
/*  Cancellation line                                                         */
/* -------------------------------------------------------------------------- */
export interface CancellationSummary {
  tone: "free" | "fees";
  text: string;
}

const fr = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

/** "15-10-2026 00:00" -> Date */
function parseMyGoDate(s?: string): Date | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(s ?? "");
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

/**
 * Turns MyGo's room policy into one readable line.
 * ASSUMPTION to confirm with MyGo's documentation: for BEFORE_ARRIVAL items,
 * "FromDate" is the date from which the fees apply, so the stay is free to cancel before it.
 */
export function cancellationSummary(policy?: any[]): CancellationSummary | null {
  if (!Array.isArray(policy) || policy.length === 0) return null;

  const before = policy.filter((p) => p?.Nature === "BEFORE_ARRIVAL");
  if (before.length === 0) return null;

  const dated = before
    .map((p) => ({ p, date: parseMyGoDate(p.FromDate) }))
    .filter((x): x is { p: any; date: Date } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (dated.length > 0) {
    const first = dated[0].date;
    return first.getTime() > now.getTime()
      ? { tone: "free", text: `Annulation gratuite jusqu'au ${fr(first)}` }
      : { tone: "fees", text: "Annulation avec frais" };
  }

  const anyFees = before.some((p) => Number(p?.Fees ?? 0) > 0);
  return anyFees
    ? { tone: "fees", text: "Annulation avec frais" }
    : { tone: "free", text: "Annulation gratuite" };
}