import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Moon,
  Globe,
  Plane,
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users,
  Search,
  Minus,
  Plus,
  PlaneTakeoff,
  PlaneLanding,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import DateRangePicker from "@/components/DateRangePicker";
import { addDays, diffDays, todayISO, type DateRange } from "@/lib/booking";

/* -------------------------------------------------------------------------- */
/*  Theme (logo palette)                                                      */
/*  teal #0A7C95 · deep teal #064B5C · gold #E3A312 / #F2B705 · orange #F28C0F */
/* -------------------------------------------------------------------------- */

type TabId = "hotels" | "omra" | "trips" | "flights" | "circuits";

const TAB_DEFS: { id: TabId; Icon: typeof Building2 }[] = [
  { id: "hotels", Icon: Building2 },
  { id: "omra", Icon: Moon },
  { id: "trips", Icon: Globe },
  { id: "flights", Icon: Plane },
  { id: "circuits", Icon: Compass },
];

/* -------------------------------------------------------------------------- */
/*  Content                                                                   */
/* -------------------------------------------------------------------------- */
const FR = {
  tabs: {
    hotels: "Hôtels Tunisie",
    omra: "Omra",
    trips: "Voyage organisé",
    flights: "Vols",
    circuits: "Circuits",
  },
  destination: "Destination",
  whereTo: "Où allez-vous ?",
  dates: "Dates",
  travelers: "Voyageurs",
  passengers: "Passagers",
  roomsLabel: "Chambres",
  room: "Chambre",
  rooms: "Chambres",
  adult: "Adulte",
  adults: "Adultes",
  child: "Enfant",
  children: "Enfants",
  night: "nuit",
  nights: "nuits",
  search: "Rechercher",
   departureMonth: "Mois de départ",
  duration: "Durée du séjour",
  allDestinations: "Toutes les destinations",
  from: "Départ de",
  to: "Vers",
  toPlaceholder: "Ville ou aéroport",
  roundTrip: "Aller-retour",
  oneWay: "Aller simple",
  departure: "Départ",
  region: "Région",
  north: "Circuit Nord",
  south: "Circuit Sud",
  done: "Valider",
};

const EN: typeof FR = {
  tabs: {
    hotels: "Hotels Tunisia",
    omra: "Omra",
    trips: "Organized trips",
    flights: "Flights",
    circuits: "Tours",
  },
  destination: "Destination",
  whereTo: "Where are you going?",
  dates: "Dates",
  travelers: "Travelers",
  passengers: "Passengers",
  roomsLabel: "Rooms",
  room: "Room",
  rooms: "Rooms",
  adult: "Adult",
  adults: "Adults",
  child: "Child",
  children: "Children",
  night: "night",
  nights: "nights",
  search: "Search",
   departureMonth: "Departure month",
  duration: "Length of stay",
  allDestinations: "All destinations",
  from: "Departing from",
  to: "Going to",
  toPlaceholder: "City or airport",
  roundTrip: "Round trip",
  oneWay: "One way",
  departure: "Departure",
  region: "Region",
  north: "North tour",
  south: "South tour",
  done: "Apply",
};

const HOTEL_DESTINATIONS = [
  "Hammamet",
  "Yasmine Hammamet",
  "Sousse",
  "Port El Kantaoui",
  "Monastir",
  "Mahdia",
  "Djerba",
  "Zarzis",
  "Tunis",
  "Tabarka",
  "Nabeul",
  "Tozeur",
];

// Values match the links used in the navbar (voyage-organise?destination=…)
const TRIP_DESTINATIONS = [
  { label: "Bali", value: "Bali" },
  { label: "Turquie — Istanbul", value: "Istanbul" },
  { label: "Turquie — Antalya", value: "Antalya" },
  { label: "Égypte", value: "Egypte" },
  { label: "Maroc — Casablanca", value: "Casablanca" },
  { label: "Dubaï", value: "Dubai" },
];

const AIRPORTS = [
  { code: "TUN", label: "Tunis (TUN)" },
  { code: "DJE", label: "Djerba (DJE)" },
  { code: "MIR", label: "Monastir (MIR)" },
  { code: "NBE", label: "Enfidha (NBE)" },
  { code: "SFA", label: "Sfax (SFA)" },
];

const FLIGHT_DESTINATIONS = [
  "Paris",
  "Marseille",
  "Lyon",
  "Istanbul",
  "Dubaï",
  "Le Caire",
  "Casablanca",
  "Jeddah",
  "Médine",
  "Rome",
  "Milan",
  "Madrid",
];

const OMRA_DURATIONS = ["7", "10", "14", "21"];

 
const pad = (n: number) => String(n).padStart(2, "0");
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                           */
/* -------------------------------------------------------------------------- */
function Shell({
  icon,
  label,
  children,
  as = "div",
  className = "",
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  as?: "div" | "label";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag
      className={`flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3.5 py-2 transition focus-within:border-[#0A7C95] focus-within:ring-2 focus-within:ring-[#0A7C95]/20 ${className}`}
    >
      <span className="shrink-0 text-[#064B5C]">{icon}</span>
      <span className="block min-w-0 flex-1 text-left">
        <span className="block text-[11px] font-medium leading-4 text-gray-500">{label}</span>
        {children}
      </span>
    </Tag>
  );
}

const inputClass =
  "block w-full min-w-0 bg-transparent text-[15px] font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-500";

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-[#064B5C] transition hover:border-[#0A7C95] hover:text-[#0A7C95] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gray-300";
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`− ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-5 text-center text-sm font-bold text-gray-900" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className={btn}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`+ ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Guests({
  label,
  summary,
  showRooms,
  rooms,
  adults,
  kids,
  onRooms,
  onAdults,
  onKids,
  L,
}: {
  label: string;
  summary: string;
  showRooms: boolean;
  rooms: number;
  adults: number;
  kids: number;
  onRooms: (v: number) => void;
  onAdults: (v: number) => void;
  onKids: (v: number) => void;
  L: typeof FR;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Shell icon={<Users className="h-5 w-5" aria-hidden="true" />} label={label}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="block w-full truncate text-left text-[15px] font-medium text-gray-900 outline-none"
        >
          {summary}
        </button>
      </Shell>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-gray-100 bg-white p-4 shadow-2xl"
        >
          {showRooms && (
            <Counter label={L.rooms} value={rooms} min={1} max={5} onChange={onRooms} />
          )}
          <Counter label={L.adults} value={adults} min={1} max={10} onChange={onAdults} />
          <Counter label={L.children} value={kids} min={0} max={6} onChange={onKids} />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg bg-[#064B5C] py-2 text-sm font-semibold text-white transition hover:bg-[#0A7C95]"
          >
            {L.done}
          </button>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Search card                                                               */
/* -------------------------------------------------------------------------- */
export default function HeroSearch() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const L = lang === "FR" ? FR : EN;
  const locale = lang === "FR" ? "fr-FR" : "en-GB";

  const today = useMemo(() => todayISO(), []);

  const [tab, setTab] = useState<TabId>("hotels");
  const [destination, setDestination] = useState("");
  const [from, setFrom] = useState("TUN");
  const [region, setRegion] = useState("nord");
  const [month, setMonth] = useState("");
  const [duration, setDuration] = useState("14");
  const [tripType, setTripType] = useState<"return" | "oneway">("return");

  const [dates, setDates] = useState<DateRange>(() => ({ from: today, to: addDays(today, 2) }));
  const checkIn = dates.from ?? today;
  // A return flight without a picked date defaults to one week
  const checkOut = dates.to ?? addDays(checkIn, tab === "flights" ? 7 : 1);

  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i, 1);
        const raw = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
        return {
          value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
          label: raw.charAt(0).toUpperCase() + raw.slice(1),
        };
      }),
    [locale]
  );
  const monthValue = month || months[0].value;

  const nights = dates.from && dates.to ? diffDays(dates.from, dates.to) : 0;
  const nightsText = nights > 0 ? plural(nights, L.night, L.nights) : undefined;

  const guestsSummary = (withRooms: boolean) =>
    [
      withRooms ? plural(rooms, L.room, L.rooms) : null,
      plural(adults, L.adult, L.adults),
      plural(kids, L.child, L.children),
    ]
      .filter(Boolean)
      .join(", ");

  const switchTab = (id: TabId) => {
    setTab(id);
    setDestination("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const p = new URLSearchParams();
    let path = "/";

    const addGuests = (withRooms: boolean) => {
      if (withRooms) p.set("rooms", String(rooms));
      p.set("adults", String(adults));
      p.set("children", String(kids));
    };

    switch (tab) {
      case "hotels":
        path = "/hotels-tunisie";
        if (destination.trim()) p.set("destination", destination.trim());
        p.set("checkIn", checkIn);
        p.set("checkOut", checkOut);
        addGuests(true);
        break;
      case "omra":
        path = "/omra";
        p.set("month", monthValue);
        p.set("nights", duration);
        addGuests(false);
        break;
      case "trips":
        path = "/voyage-organise";
        if (destination) p.set("destination", destination);
        p.set("month", monthValue);
        addGuests(false);
        break;
      case "flights":
        path = "/vol";
        p.set("from", from);
        if (destination.trim()) p.set("to", destination.trim());
        p.set("tripType", tripType);
        p.set("depart", checkIn);
        if (tripType === "return") p.set("return", checkOut);
        addGuests(false);
        break;
      case "circuits":
        path = "/circuit";
        p.set("region", region);
        p.set("month", monthValue);
        addGuests(false);
        break;
    }

    navigate(`${path}?${p.toString()}`);
  };

  const guests = (withRooms: boolean, label: string, className = "") => (
    <div className={className}>
      <Guests
        label={label}
        summary={guestsSummary(withRooms)}
        showRooms={withRooms}
        rooms={rooms}
        adults={adults}
        kids={kids}
        onRooms={setRooms}
        onAdults={setAdults}
        onKids={setKids}
        L={L}
      />
    </div>
  );

  const monthSelect = (className = "") => (
    <Shell
      as="label"
      className={className}
      icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
      label={L.departureMonth}
    >
      <select value={monthValue} onChange={(e) => setMonth(e.target.value)} className={`${inputClass} cursor-pointer`}>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </Shell>
  );

  return (
    <div className="relative z-10 mx-3 -mt-16 rounded-2xl border border-gray-100 bg-white shadow-2xl sm:mx-6">
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Type de recherche"
        className="flex overflow-x-auto border-b border-gray-100 px-2 [scrollbar-width:none] sm:px-4"
      >
        {TAB_DEFS.map(({ id, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTab(id)}
              className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3.5 text-sm transition-colors sm:px-4 ${
                active
                  ? "font-semibold text-[#0A7C95] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-[#E3A312]"
                  : "font-medium text-gray-700 hover:text-[#0A7C95]"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {L.tabs[id]}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <form onSubmit={handleSubmit} role="tabpanel" className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tab === "hotels" && (
            <>
              <Shell
                as="label"
                className="sm:col-span-2"
                icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
                label={L.destination}
              >
                <input
                  type="text"
                  list="hero-hotel-destinations"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={L.whereTo}
                  autoComplete="off"
                  className={inputClass}
                />
                <datalist id="hero-hotel-destinations">
                  {HOTEL_DESTINATIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Shell>

              <DateRangePicker
                label={L.dates}
                value={dates}
                onChange={setDates}
                min={today}
                lang={lang}
                badge={nightsText}
              />
              {guests(true, L.roomsLabel)}
            </>
          )}

          {tab === "omra" && (
            <>
              {monthSelect()}
              <Shell
                as="label"
                icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                label={L.duration}
              >
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  {OMRA_DURATIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} {L.nights}
                    </option>
                  ))}
                </select>
              </Shell>
              {guests(false, L.travelers, "sm:col-span-2")}
            </>
          )}

          {tab === "trips" && (
            <>
              <Shell
                as="label"
                className="sm:col-span-2"
                icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
                label={L.destination}
              >
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">{L.allDestinations}</option>
                  {TRIP_DESTINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Shell>
              {monthSelect()}
              {guests(false, L.travelers)}
            </>
          )}

          {tab === "flights" && (
            <>
              <div
                className="flex gap-2 sm:col-span-2"
                role="radiogroup"
                aria-label={`${L.roundTrip} / ${L.oneWay}`}
              >
                {(["return", "oneway"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={tripType === type}
                    onClick={() => setTripType(type)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      tripType === type
                        ? "bg-[#064B5C] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-[#E8F5F8] hover:text-[#0A7C95]"
                    }`}
                  >
                    {type === "return" ? L.roundTrip : L.oneWay}
                  </button>
                ))}
              </div>

              <Shell
                as="label"
                icon={<PlaneTakeoff className="h-5 w-5" aria-hidden="true" />}
                label={L.from}
              >
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </Shell>

              <Shell
                as="label"
                icon={<PlaneLanding className="h-5 w-5" aria-hidden="true" />}
                label={L.to}
              >
                <input
                  type="text"
                  list="hero-flight-destinations"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={L.toPlaceholder}
                  autoComplete="off"
                  className={inputClass}
                />
                <datalist id="hero-flight-destinations">
                  {FLIGHT_DESTINATIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Shell>

              <DateRangePicker
                label={tripType === "return" ? L.dates : L.departure}
                value={dates}
                onChange={setDates}
                min={today}
                single={tripType === "oneway"}
                minNights={0}
                lang={lang}
              />
              {guests(false, L.passengers)}
            </>
          )}

          {tab === "circuits" && (
            <>
              <Shell
                as="label"
                icon={<Compass className="h-5 w-5" aria-hidden="true" />}
                label={L.region}
              >
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="nord">{L.north}</option>
                  <option value="sud">{L.south}</option>
                </select>
              </Shell>
              {monthSelect()}
              {guests(false, L.travelers, "sm:col-span-2")}
            </>
          )}
        </div>

        <button
          type="submit"
          className="mx-auto mt-4 flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#F28C0F] to-[#F2B705] text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          {L.search}
        </button>

        
      </form>
    </div>
  );
}