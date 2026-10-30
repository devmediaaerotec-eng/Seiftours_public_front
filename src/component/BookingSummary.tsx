import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clock, MapPin, Pencil, Star } from "lucide-react";
import type { Amounts } from "@/lib/Payment";
import type { CheckoutDraft } from "@/lib/checkoutDraft";
import { fromISO } from "@/lib/booking";

interface BookingSummaryProps {
  draft: CheckoutDraft;
  nights: number;
  amounts: Amounts;
  /** "card" = online deposit, "agency" = everything paid at the agency */
  method: "card" | "agency";
  /** Time left before the prices expire, in ms */
  remainingMs: number;
  /** Where "Modifier" goes (the hotel page) */
  editHref: string;
}

const money = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
const shortDay = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(fromISO(iso));
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function Tnd({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <sup className="ml-0.5 text-[0.6em] font-bold">TND</sup>
    </>
  );
}

/** Right-hand card of the checkout page: hotel, dates, room, prices. */
export default function BookingSummary({ draft, nights, amounts, method, remainingMs, editHref }: BookingSummaryProps) {
  const adults = draft.rooms.reduce((s, r) => s + r.adults, 0);
  const kids = draft.rooms.reduce((s, r) => s + r.children, 0);
  const people =
    `${adults} adulte${adults > 1 ? "s" : ""}` + (kids ? `, ${kids} enfant${kids > 1 ? "s" : ""}` : "");
  const saving = draft.oldTotal && draft.oldTotal > draft.total ? Math.round(draft.oldTotal - draft.total) : 0;
  const expired = remainingMs <= 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-xl shadow-[#064B5C]/5">
      {draft.imageUrl && <img src={draft.imageUrl} alt="" loading="lazy" className="h-44 w-full object-cover" />}

      <div className="space-y-4 p-5">
        {/* Hotel */}
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">{draft.hotelName}</h2>
          {draft.stars ? (
            <div className="mt-1 flex" role="img" aria-label={`${draft.stars} étoiles`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  aria-hidden="true"
                  className={`h-4 w-4 ${i < draft.stars! ? "fill-[#F2B705] text-[#F2B705]" : "text-gray-300"}`}
                />
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              {draft.city && (
                <>
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {draft.city}
                </>
              )}
              {draft.rating ? <span className="ml-2 font-semibold text-gray-900">{draft.rating.toFixed(1)} / 5</span> : null}
            </span>
            <Link to={editHref} className="inline-flex items-center gap-1 font-semibold text-[#0A7C95] underline">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Modifier
            </Link>
          </div>
        </div>

        {/* Dates */}
        <dl className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 text-sm">
          <div>
            <dt className="text-gray-500">Arrivée</dt>
            <dd className="mt-0.5 font-bold text-gray-900 first-letter:uppercase">{shortDay(draft.checkIn)}</dd>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <dt className="text-gray-500">Départ</dt>
            <dd className="mt-0.5 font-bold text-gray-900 first-letter:uppercase">{shortDay(draft.checkOut)}</dd>
          </div>
        </dl>

        {/* Stay + room */}
        <div className="space-y-2 border-t border-gray-200 pt-4 text-sm text-gray-900">
          <p className="font-bold">
            {nights} nuit{nights > 1 ? "s" : ""}
            {draft.boardingName ? <span className="font-semibold"> | {draft.boardingName}</span> : null}
          </p>
          <p className="text-gray-700">
            <span className="font-bold">{draft.rooms.length}×</span> {draft.roomName} : {people}
          </p>
        </div>

        {/* Prices */}
        <div className="rounded-2xl bg-[#E8F5F8] p-4">
          <p
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              expired ? "bg-red-100 text-red-700" : "bg-[#064B5C] text-white"
            }`}
            role="timer"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {expired ? "Tarif expiré" : `Tarif garanti encore ${mmss(remainingMs)}`}
          </p>

          {saving > 0 && (
            <p className="mb-1 text-right">
              <span className="rounded-md border border-[#F28C0F]/60 px-2 py-0.5 text-xs font-bold text-[#B45F00]">
                -{money(saving)} TND
              </span>
            </p>
          )}
          <div className="flex items-end justify-between gap-3">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-right">
              {saving > 0 && (
                <span className="mr-2 text-sm text-gray-400 line-through">{money(draft.oldTotal!)} TND</span>
              )}
              <span className="text-3xl font-extrabold text-gray-900">
                <Tnd>{money(draft.total)}</Tnd>
              </span>
            </span>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          {method === "card" ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-bold text-gray-900">Je paye en ligne</dt>
                <dd className="text-xl font-extrabold text-[#0A7C95]">
                  <Tnd>{money(amounts.deposit)}</Tnd>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-gray-700">Je paye à l'hôtel</dt>
                <dd className="text-lg font-bold text-gray-900">
                  <Tnd>{money(amounts.remaining)}</Tnd>
                </dd>
              </div>
            </>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-gray-900">Je paye à l'agence</dt>
              <dd className="text-xl font-extrabold text-gray-900">
                <Tnd>{money(amounts.total)}</Tnd>
              </dd>
            </div>
          )}
          {draft.touristTax ? (
            <p className="text-gray-500">Taxe de séjour non comprise : {money(draft.touristTax)} TND</p>
          ) : null}
        </dl>

        {draft.cancellation && (
          <p
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-center text-sm font-medium ${
              draft.cancellation.tone === "free" ? "bg-emerald-50 text-emerald-700" : "bg-[#FFF6DD] text-[#8A5A00]"
            }`}
          >
            {draft.cancellation.tone === "free" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {draft.cancellation.text}
          </p>
        )}
      </div>
    </div>
  );
}
