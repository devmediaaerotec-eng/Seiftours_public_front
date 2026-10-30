/**
 * Payment rules shown in the interface.
 * The SERVER applies the same rules and is the only source of truth:
 * the browser only displays them (see server/bookings.mjs, DEPOSIT_RATE / DEPOSIT_MIN).
 */
export const PAYMENT = {
  currency: "TND",
  depositRate: 0.15, // PLACEHOLDER: put the agency's real rule here AND in the server .env
  minDeposit: 30, // PLACEHOLDER
};

export type BookingMode = "agency" | "deposit";

export interface Amounts {
  total: number;
  deposit: number; // paid online now ("deposit" mode)
  remaining: number; // paid at the hotel after an online deposit
  currency: string;
}

export function depositFor(total: number): number {
  if (!(total > 0)) return 0;
  const raw = Math.max(PAYMENT.minDeposit, Math.round(total * PAYMENT.depositRate));
  return Math.min(raw, Math.round(total));
}

export function amountsFor(total: number): Amounts {
  const t = Math.round(total);
  const deposit = depositFor(t);
  return { total: t, deposit, remaining: Math.max(0, t - deposit), currency: PAYMENT.currency };
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