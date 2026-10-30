import { AlertCircle, CheckCircle2, CreditCard, Loader2, Lock, RefreshCw, Store, TriangleAlert } from "lucide-react";
import type { Amounts, BookingMode, CancellationSummary } from "@/lib/Payment";
import type { GuestDetails } from "@/lib/Bookingapi";

export type GuestErrors = Partial<Record<keyof GuestDetails, string>>;

interface CheckoutPanelProps {
  /** Selected room offer, or null when nothing is selected */
  room: { name: string; boardingName?: string } | null;
  nights: number;
  total: number;
  /** Price before a promotion, when the supplier gives one: shows the strike-through and the saving */
  oldTotal?: number;
  amounts: Amounts | null;
  cancellation: CancellationSummary | null;

  guest: GuestDetails;
  errors: GuestErrors;
  onGuestChange: (patch: Partial<GuestDetails>) => void;

  onChoose: (mode: BookingMode) => void;
  /** Mode being submitted right now (shows a spinner) */
  busyMode?: BookingMode | null;
  disabled?: boolean;
  submitError?: string | null;

  /** Prices are old: ask for a refresh before booking */
  stale?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const money = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

const inputBase =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:outline-none focus:ring-2";
const inputClass = (error?: string) =>
  `${inputBase} ${
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-gray-300 focus:border-[#0A7C95] focus:ring-[#0A7C95]/20"
  }`;

function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Right-hand booking card:
 * guest details, price recap, cancellation line and the two ways to book
 * (pay at the agency, or pay a deposit online and the rest at the hotel).
 */
export default function CheckoutPanel({
  room,
  nights,
  total,
  oldTotal,
  amounts,
  cancellation,
  guest,
  errors,
  onGuestChange,
  onChoose,
  busyMode = null,
  disabled = false,
  submitError,
  stale = false,
  onRefresh,
  refreshing = false,
}: CheckoutPanelProps) {
  const busy = busyMode !== null;
  const saving = oldTotal && oldTotal > total ? Math.round(oldTotal - total) : 0;
  const locked = disabled || busy || stale || !room;

  const text = (key: keyof GuestDetails, id: string, type = "text", autoComplete?: string) => ({
    id,
    type,
    autoComplete,
    value: guest[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onGuestChange({ [key]: e.target.value }),
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `${id}-error` : undefined,
    className: inputClass(errors[key]),
  });

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200/70 border-t-4 border-t-[#E3A312] bg-white shadow-xl shadow-[#064B5C]/5">
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Votre réservation</h2>
          {room ? (
            <p className="mt-1 text-sm text-gray-600">
              {room.name}
              {room.boardingName ? ` · ${room.boardingName}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Choisissez une chambre pour voir le prix.</p>
          )}
        </div>

        {/* Prices are old: refresh before booking */}
        {stale && (
          <div className="flex items-start gap-2 rounded-xl border border-[#E3A312]/40 bg-[#FFF6DD] p-3 text-sm text-[#7A5200]">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              Les tarifs datent de plus de 10 minutes.
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="ml-2 inline-flex items-center gap-1 font-semibold underline disabled:opacity-60"
                >
                  {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Actualiser
                </button>
              )}
            </div>
          </div>
        )}

        {/* Guest details */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field id="bk-first" label="Prénom" error={errors.firstName}>
              <input {...text("firstName", "bk-first", "text", "given-name")} />
            </Field>
            <Field id="bk-last" label="Nom" error={errors.lastName}>
              <input {...text("lastName", "bk-last", "text", "family-name")} />
            </Field>
          </div>
          <Field id="bk-email" label="E-mail" error={errors.email}>
            <input {...text("email", "bk-email", "email", "email")} placeholder="email@exemple.com" />
          </Field>
          <Field id="bk-phone" label="Téléphone" error={errors.phone}>
            <input {...text("phone", "bk-phone", "tel", "tel")} placeholder="+216 …" />
          </Field>
        </div>

        {/* Price recap */}
        {room && total > 0 && (
          <div className="border-t border-dashed border-gray-200 pt-4">
            {saving > 0 && (
              <span className="mb-1 inline-block rounded-md border border-[#F28C0F]/50 px-2 py-0.5 text-xs font-bold text-[#B45F00]">
                -{money(saving)} TND
              </span>
            )}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Prix total</p>
                <p className="text-xs text-gray-500">
                  {nights} nuit{nights > 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                {saving > 0 && (
                  <span className="mr-2 text-sm text-gray-400 line-through">{money(oldTotal!)} TND</span>
                )}
                <span className="text-3xl font-extrabold leading-none text-gray-900">{money(total)}</span>
                <sup className="ml-0.5 text-xs font-bold text-gray-900">TND</sup>
              </div>
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">Des frais peuvent s'appliquer</p>

            {amounts && (
              <dl className="mt-3 space-y-1 rounded-xl bg-[#E8F5F8]/70 px-3 py-2.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-600">À payer maintenant (acompte)</dt>
                  <dd className="font-bold text-[#0A7C95]">{money(amounts.deposit)} TND</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Reste à régler à l'hôtel</dt>
                  <dd className="font-semibold text-gray-800">{money(amounts.remaining)} TND</dd>
                </div>
              </dl>
            )}
          </div>
        )}

        {cancellation && (
          <p
            className={`flex items-center justify-center gap-1.5 text-center text-sm font-medium ${
              cancellation.tone === "free" ? "text-emerald-700" : "text-[#8A5A00]"
            }`}
          >
            {cancellation.tone === "free" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {cancellation.text}
          </p>
        )}

        {submitError && (
          <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {submitError}
          </p>
        )}

        {/* The two ways to book */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onChoose("deposit")}
            disabled={locked || !amounts}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-4 text-[15px] font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyMode === "deposit" ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <span>
              Je paie {amounts ? money(amounts.deposit) : "…"} <span className="text-xs font-extrabold">TND</span> et le
              reste à l'hôtel
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChoose("agency")}
            disabled={locked}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0A7C95] px-4 text-[15px] font-bold text-[#0A7C95] transition hover:bg-[#E8F5F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyMode === "agency" ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Store className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            Je passe à l'agence
          </button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          Paiement sécurisé : vos données bancaires ne passent jamais par notre site.
        </p>
      </div>
    </div>
  );
}