import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from "react";
import { DayPicker } from "react-day-picker";
import { enGB, fr } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { ArrowRight, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { completeRange, diffDays, fromISO, pickDay, toISO, type DateRange } from "@/lib/booking";

interface Props {
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
  /** Small pill on the right of the field, e.g. "3 nuits" */
  badge?: string;
  className?: string;
  /** Always one month (narrow containers such as dialogs) */
  compact?: boolean;
}

const TEXT = {
  FR: { pickEnd: "Choisissez la date de fin", pickStart: "Choisissez la date de début", close: "Valider" },
  EN: { pickEnd: "Pick the end date", pickStart: "Pick the start date", close: "Done" },
};

const theme = {
  "--rdp-accent-color": "#0A7C95",
  "--rdp-accent-background-color": "#E8F5F8",
  "--rdp-day-height": "40px",
  "--rdp-day-width": "40px",
  "--rdp-day_button-height": "38px",
  "--rdp-day_button-width": "38px",
} as CSSProperties;

/** Field showing "start → end" that opens a calendar: first click = start, second click = end. */
export default function DateRangePicker({
  label,
  value,
  onChange,
  min,
  single,
  minNights = 1,
  lang,
  badge,
  className = "",
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const t = TEXT[lang];
  const locale = lang === "FR" ? fr : enGB;
  const fmt = new Intl.DateTimeFormat(lang === "FR" ? "fr-FR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const close = () => {
    setOpen(false);
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
      if (!ref.current?.contains(e.target as Node)) onOutside();
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
    if (next.to) setOpen(false);
  };

  const shown = (iso?: string) => (iso ? fmt.format(fromISO(iso)) : "—");
  const selected = { from: value.from ? fromISO(value.from) : undefined, to: value.to ? fromISO(value.to) : undefined };
  const common = {
    locale,
    autoFocus: true,
    numberOfMonths: isMobile || single || compact ? 1 : 2,
    defaultMonth: fromISO(value.from ?? min),
    startMonth: fromISO(min),
    disabled: { before: fromISO(min) },
    style: theme,
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-left transition focus-visible:border-[#0A7C95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]/20"
      >
        <Calendar className="h-5 w-5 shrink-0 text-[#064B5C]" aria-hidden="true" />
        <span className="block min-w-0 flex-1">
          <span className="block text-[11px] font-medium leading-4 text-gray-500">{label}</span>
          <span className="flex items-center gap-2 text-[15px] font-medium text-gray-900">
            <span>{shown(value.from)}</span>
            {!single && (
              <>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                <span>{shown(value.to)}</span>
              </>
            )}
            {badge && (
              <span className="ml-auto shrink-0 rounded-full bg-[#E8F5F8] px-2 py-0.5 text-[11px] font-semibold text-[#0A7C95]">
                {badge}
              </span>
            )}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 top-full z-40 mt-2 rounded-xl border border-gray-100 bg-white p-3 shadow-2xl max-sm:right-0 max-sm:flex max-sm:flex-col max-sm:items-center"
        >
          {single ? (
            <DayPicker
              {...common}
              mode="single"
              required
              selected={selected.from}
              onSelect={(_, day) => onDay(day)}
            />
          ) : (
            <DayPicker
              {...common}
              mode="range"
              selected={selected.from ? { from: selected.from, to: selected.to } : undefined}
              onSelect={(_, day) => onDay(day)}
              footer={
                <p className="mt-2 text-xs text-gray-500" aria-live="polite">
                  {value.from && !value.to ? t.pickEnd : t.pickStart}
                </p>
              }
            />
          )}
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full rounded-lg bg-[#064B5C] py-2 text-sm font-semibold text-white transition hover:bg-[#0A7C95]"
          >
            {t.close}
          </button>
        </div>
      )}
    </div>
  );
}
