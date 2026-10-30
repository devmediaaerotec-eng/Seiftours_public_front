import { useEffect, useState } from "react";
import { CalendarDays, Users, Pencil, Loader2, RefreshCw, X, AlertCircle } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import RoomComposer, { roomSummary } from "@/components/RoomComposer";
import { addDays, diffDays, fromISO, isISO, type RoomConfig } from "@/lib/booking";

export interface Stay {
  checkIn: string;
  checkOut: string;
  rooms: RoomConfig[];
}

interface StayEditorProps extends Stay {
  today: string;
  /** Called with the new stay; the parent re-runs the availability search */
  onApply: (stay: Stay) => void;
  /** True while the parent is searching availability for the new stay */
  busy?: boolean;
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const fmt = (iso: string) => (isISO(iso) ? dayFormat.format(fromISO(iso)) : "—");

/**
 * Compact bar showing the stay (dates, nights, rooms and guests).
 * "Modifier" opens the same date and room pickers as the search page, in place.
 */
export default function StayEditor({ checkIn, checkOut, rooms, today, onApply, busy = false }: StayEditorProps) {
  const hasDates = isISO(checkIn) && isISO(checkOut);

  const [open, setOpen] = useState(!hasDates); // no dates yet: start open
  const [draft, setDraft] = useState<Stay>({
    checkIn: hasDates ? checkIn : addDays(today, 1),
    checkOut: hasDates ? checkOut : addDays(today, 4),
    rooms,
  });
  const [error, setError] = useState<string | null>(null);

  // Keep the draft in line when the URL changes from outside (back button, shared link…)
  const roomsKey = JSON.stringify(rooms);
  useEffect(() => {
    if (!open) {
      setDraft({
        checkIn: hasDates ? checkIn : addDays(today, 1),
        checkOut: hasDates ? checkOut : addDays(today, 4),
        rooms,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, roomsKey]);

  const nights = hasDates ? diffDays(checkIn, checkOut) : 0;
  const draftNights = isISO(draft.checkIn) && isISO(draft.checkOut) ? diffDays(draft.checkIn, draft.checkOut) : 0;

  const apply = () => {
    if (!isISO(draft.checkIn) || !isISO(draft.checkOut)) {
      setError("Choisissez vos dates d'arrivée et de départ.");
      return;
    }
    if (draft.checkOut <= draft.checkIn) {
      setError("La date de départ doit être après la date d'arrivée.");
      return;
    }
    setError(null);
    onApply(draft);
    setOpen(false);
  };

  const cancel = () => {
    setError(null);
    setDraft({ checkIn: hasDates ? checkIn : addDays(today, 1), checkOut: hasDates ? checkOut : addDays(today, 4), rooms });
    if (hasDates) setOpen(false);
  };

  return (
    <section
      aria-label="Votre séjour"
      className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-sm sm:p-4"
    >
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 font-medium text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5F8] text-[#0A7C95]">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              {fmt(checkIn)} → {fmt(checkOut)}
              <span className="rounded-full bg-[#E8F5F8] px-2 py-0.5 text-xs font-semibold text-[#0A7C95]">
                {nights} nuit{nights > 1 ? "s" : ""}
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-gray-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5F8] text-[#0A7C95]">
                <Users className="h-4 w-4" aria-hidden="true" />
              </span>
              {roomSummary(rooms)}
            </span>
            {busy && (
              <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A7C95]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Mise à jour des disponibilités…
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A7C95]/30 px-3.5 py-2 text-sm font-semibold text-[#0A7C95] transition hover:bg-[#E8F5F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Modifier
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">
              {hasDates ? "Modifier votre séjour" : "Choisissez vos dates"}
            </h2>
            {hasDates && (
              <button
                type="button"
                onClick={cancel}
                aria-label="Fermer sans modifier"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-2 lg:grid-cols-[1.6fr_1.2fr_auto]">
            <DateRangePicker
              label="Dates"
              value={{ from: draft.checkIn || undefined, to: draft.checkOut || undefined }}
              onChange={(r) => setDraft((d) => ({ ...d, checkIn: r.from ?? "", checkOut: r.to ?? "" }))}
              min={today}
              lang="FR"
              badge={draftNights > 0 ? `${draftNights} nuit${draftNights > 1 ? "s" : ""}` : undefined}
            />

            <div>
              <RoomComposer rooms={draft.rooms} onChange={(r) => setDraft((d) => ({ ...d, rooms: r }))} />
            </div>

            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-sm font-bold text-[#06303A] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95] focus-visible:ring-offset-2 disabled:opacity-60 md:col-span-2 lg:col-span-1"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              )}
              Voir les disponibilités
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}