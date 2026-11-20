import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { enGB, fr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { ArrowRight, CalendarDays, Moon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { completeRange, diffDays, fromISO, pickDay, toISO, type DateRange } from "@/lib/booking";

interface Props {
  /** Dialog title / accessible name */
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** First selectable day (ISO) */
  min: string;
  /** One date only (one-way flight) */
  single?: boolean;
  /** 1 for hotels (one night minimum), 0 allows same-day ranges */
  minNights?: number;
  lang: "FR" | "EN";
  /** Names of the two dates; default Arrivée / Départ */
  labels?: [string, string];
  /** Length shown next to the dates: nights (hotels) or days (trips) */
  unit?: "nights" | "days";
  className?: string;
  /** Always one month (narrow containers such as dialogs) */
  compact?: boolean;
}

const TEXT = {
  FR: {
    labels: ["Arrivée", "Départ"] as [string, string],
    pickOne: "Choisissez une date",
    pickStart: "Choisissez la date d'arrivée",
    pickEnd: "Choisissez maintenant la date de départ",
    choose: "Choisir",
    clear: "Effacer",
    close: "Valider",
    nights: (n: number) => `${n} nuit${n > 1 ? "s" : ""}`,
    days: (n: number) => `${n} jour${n > 1 ? "s" : ""}`,
    today: "Aujourd'hui",
    unavailable: "Indisponible",
  },
  EN: {
    labels: ["Check-in", "Check-out"] as [string, string],
    pickOne: "Pick a date",
    pickStart: "Pick the start date",
    pickEnd: "Now pick the end date",
    choose: "Choose",
    clear: "Clear",
    close: "Done",
    nights: (n: number) => `${n} night${n > 1 ? "s" : ""}`,
    days: (n: number) => `${n} day${n > 1 ? "s" : ""}`,
    today: "Today",
    unavailable: "Unavailable",
  },
};

/** Field "start | end" that opens a calendar: first click = start, second click = end. */
export default function DateRangePicker({
  label,
  value,
  onChange,
  min,
  single,
  minNights = 1,
  lang,
  labels,
  unit = "nights",
  className = "",
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const t = TEXT[lang];
  const [startLabel, endLabel] = labels ?? t.labels;
  const locale = lang === "FR" ? fr : enGB;
  const intl = lang === "FR" ? "fr-FR" : "en-GB";
  const thisYear = new Date().getFullYear();
  // "sam. 10 juil." — the year only when it is not this year, so a 2027 stay is never ambiguous
  const shown = (iso?: string) => {
    if (!iso) return null;
    const d = fromISO(iso);
    return new Intl.DateTimeFormat(intl, {
      weekday: "short",
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== thisYear ? { year: "numeric" } : {}),
    }).format(d);
  };

  const length = !single && value.from && value.to ? diffDays(value.from, value.to) : 0;
  const lengthText = length > 0 ? (unit === "nights" ? t.nights(length) : t.days(length + 1)) : null;

  const close = () => {
    setOpen(false);
    setHover(null);
    // Never leave a half-picked range behind: the end becomes start + minimum stay
    if (!single) {
      const done = completeRange(value, { minNights });
      if (done !== value) onChange(done);
    }
  };
  const onOutside = useEffectEvent(close);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !sheetRef.current?.contains(t)) onOutside();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOutside();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onDay = (day: Date) => {
    const iso = toISO(day);
    if (single) {
      // Keep the end date (for a later switch back to a range) only while it still fits after the start
      onChange({ from: iso, to: value.to && diffDays(iso, value.to) >= minNights ? value.to : undefined });
      setOpen(false);
      return;
    }
    const next = pickDay(value, iso, { minNights });
    onChange(next);
    setHover(null);
    if (next.to) setOpen(false);
  };

  const picking = !single && !!value.from && !value.to;
  // While the end is being chosen, the hovered day previews the range
  const previewTo = picking && hover && diffDays(value.from!, hover) >= minNights ? hover : value.to;
  const selected = {
    from: value.from ? fromISO(value.from) : undefined,
    to: previewTo ? fromISO(previewTo) : undefined,
  };
  const common = {
    locale,
    autoFocus: true,
    className: "st-cal",
    numberOfMonths: isMobile || single || compact ? 1 : 2,
    defaultMonth: fromISO(value.from ?? min),
    startMonth: fromISO(min),
    disabled: { before: fromISO(min) },
    showOutsideDays: false,
    labels: {
      labelDayButton: (date: Date, m: { today?: boolean; disabled?: boolean }) =>
        `${new Intl.DateTimeFormat(intl, { dateStyle: "full" }).format(date)}${m.today ? `, ${t.today}` : ""}${m.disabled ? `, ${t.unavailable}` : ""}`,
    },
  };

  const half = (title: string, iso: string | undefined, active: boolean) => (
    <span
      className={`block min-w-0 flex-1 rounded-lg px-2 py-1 transition ${active ? "bg-brand-100 ring-1 ring-brand-600/30" : ""}`}
    >
      <span className="block text-[11px] font-semibold uppercase leading-4 tracking-wide text-gray-500">{title}</span>
      <span className={`block truncate text-[15px] font-semibold ${iso ? "text-gray-900" : "font-normal text-gray-400"}`}>
        {shown(iso) ?? t.choose}
      </span>
    </span>
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${label} : ${shown(value.from) ?? "—"}${single ? "" : ` → ${shown(value.to) ?? "—"}`}${lengthText ? `, ${lengthText}` : ""}`}
        className={`flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-1.5 text-left transition hover:border-brand-600/60 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20 ${
          open ? "border-brand-600 ring-2 ring-brand-600/20" : "border-gray-300"
        }`}
      >
        <CalendarDays className="h-5 w-5 shrink-0 text-brand-800" aria-hidden="true" />
        {half(startLabel, value.from, open && !picking)}
        {!single && (
          <>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            {half(endLabel, value.to, open && picking)}
          </>
        )}
        {lengthText && (
          <span className="ml-1 hidden shrink-0 items-center gap-1 rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-bold text-gold-700 sm:inline-flex">
            {unit === "nights" && <Moon className="h-3 w-3" aria-hidden="true" />}
            {lengthText}
          </span>
        )}
      </button>

      <div ref={setSheetHost} />
      {open && sheetHost && createPortal(
        <>
          {/* Mobile: the calendar is a bottom sheet over a dimmed page */}
          <div className="fixed inset-0 z-[60] bg-brand-900/40 sm:hidden" aria-hidden="true" onClick={close} />
          <div
            ref={sheetRef}
            role="dialog"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-[70] sm:z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-max sm:max-h-none sm:overflow-visible sm:rounded-2xl sm:border sm:border-gray-100"
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" aria-hidden="true" />

            {/* What is selected so far */}
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 p-2">
              {half(startLabel, value.from, !picking && !single)}
              {!single && (
                <>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                  {half(endLabel, previewTo, picking)}
                </>
              )}
              {!single && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white" aria-live="polite">
                  {previewTo && value.from
                    ? unit === "nights"
                      ? t.nights(diffDays(value.from, previewTo))
                      : t.days(diffDays(value.from, previewTo) + 1)
                    : "—"}
                </span>
              )}
            </div>

            <div className="flex justify-center">
              {single ? (
                <DayPicker {...common} mode="single" required selected={selected.from} onSelect={(_, day) => onDay(day)} />
              ) : (
                <DayPicker
                  {...common}
                  mode="range"
                  selected={selected.from ? { from: selected.from, to: selected.to } : undefined}
                  onSelect={(_, day) => onDay(day)}
                  onDayMouseEnter={(day) => picking && setHover(toISO(day))}
                  onDayMouseLeave={() => setHover(null)}
                />
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
              <p className="mr-auto text-xs font-medium text-gray-600" aria-live="polite">
                {single ? t.pickOne : picking ? t.pickEnd : t.pickStart}
              </p>
              <span className="flex items-center gap-3 text-[11px] text-gray-500" aria-hidden="true">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-500" /> {t.today}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-gray-300 line-through">12</span> {t.unavailable}
                </span>
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              {(value.from || value.to) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({});
                    setHover(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {t.clear}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-xl bg-brand-800 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                {t.close}
              </button>
            </div>
          </div>
        </>,
        // Mobile: render on <body> so the sheet escapes the form's stacking context (it covers the whole screen)
        isMobile ? document.body : sheetHost
      )}
    </div>
  );
}
