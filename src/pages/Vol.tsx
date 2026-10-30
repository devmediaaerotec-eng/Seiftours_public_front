import { useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  ArrowLeftRight,
  Users,
  Search,
  Clock,
  Luggage,
  MessageCircle,
  SearchX,
} from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import DateRangePicker from "@/components/DateRangePicker";
import { addDays, diffDays, isISO, todayISO, type DateRange } from "@/lib/booking";

interface Flight {
  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  price: number;
  class: string;
}

const flights: Flight[] = [
  { airline: "Tunisair", from: "Tunis (TUN)", to: "Paris (CDG)", departure: "07:30", arrival: "10:45", duration: "3h15", stops: 0, price: 189, class: "Économique" },
  { airline: "Nouvelair", from: "Tunis (TUN)", to: "Istanbul (IST)", departure: "14:20", arrival: "18:05", duration: "2h45", stops: 0, price: 229, class: "Économique" },
  { airline: "Emirates", from: "Tunis (TUN)", to: "Dubaï (DXB)", departure: "23:50", arrival: "09:15+1", duration: "6h25", stops: 0, price: 449, class: "Économique" },
  { airline: "Turkish Airlines", from: "Tunis (TUN)", to: "Maldives (MLE)", departure: "14:20", arrival: "09:30+1", duration: "13h10", stops: 1, price: 699, class: "Économique" },
  { airline: "Air France", from: "Tunis (TUN)", to: "Paris (CDG)", departure: "18:15", arrival: "21:30", duration: "3h15", stops: 0, price: 219, class: "Économique" },
  { airline: "Royal Air Maroc", from: "Tunis (TUN)", to: "Casablanca (CMN)", departure: "10:10", arrival: "11:55", duration: "2h45", stops: 0, price: 179, class: "Économique" },
];

// Same airports and suggestions as the home search
const AIRPORTS = [
  { code: "TUN", label: "Tunis (TUN)" },
  { code: "DJE", label: "Djerba (DJE)" },
  { code: "MIR", label: "Monastir (MIR)" },
  { code: "NBE", label: "Enfidha (NBE)" },
  { code: "SFA", label: "Sfax (SFA)" },
];
const DESTINATIONS = ["Paris", "Istanbul", "Dubaï", "Casablanca", "Maldives", "Marseille", "Lyon", "Le Caire", "Jeddah"];

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const code = (place: string) => place.match(/\(([A-Z]{3})\)/)?.[1] ?? place;
const city = (place: string) => place.replace(/\s*\([A-Z]{3}\)/, "");

const fieldShell =
  "flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3.5 py-2 transition focus-within:border-[#0A7C95] focus-within:ring-2 focus-within:ring-[#0A7C95]/20";
const fieldLabel = "block text-[11px] font-medium leading-4 text-gray-500";
const fieldInput = "block w-full min-w-0 bg-transparent text-[15px] font-medium text-gray-900 outline-none";

const AIRLINE_COLORS = ["#0A7C95", "#064B5C", "#E3A312", "#F28C0F", "#12A5BF", "#06303A"];

export default function VolPage() {
  const [params, setParams] = useSearchParams();
  const today = useMemo(() => todayISO(), []);

  // Prefill from the home search: /vol?from=TUN&to=Paris&tripType=return&depart=…&return=…&adults=2
  const depart = params.get("depart");
  const ret = params.get("return");
  const [tripType, setTripType] = useState<"return" | "oneway">(
    params.get("tripType") === "oneway" ? "oneway" : "return"
  );
  const [from, setFrom] = useState(AIRPORTS.some((a) => a.code === params.get("from")) ? params.get("from")! : "TUN");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [dates, setDates] = useState<DateRange>(() => {
    const start = isISO(depart) && depart >= today ? depart : addDays(today, 7);
    return { from: start, to: isISO(ret) && ret >= start ? ret : addDays(start, 7) };
  });
  const [passengers, setPassengers] = useState(() =>
    Math.min(9, Math.max(1, (Number(params.get("adults")) || 1) + (Number(params.get("children")) || 0)))
  );
  const [directOnly, setDirectOnly] = useState(false);
  const [sort, setSort] = useState<"price" | "departure">("price");
  // Destination actually searched (the list does not change while typing)
  const [query, setQuery] = useState(params.get("to") ?? "");

  const results = useMemo(() => {
    const q = normalize(query);
    const list = flights.filter(
      (f) =>
        code(f.from) === from &&
        (!q || normalize(f.to).includes(q) || q.includes(normalize(city(f.to)))) &&
        (!directOnly || f.stops === 0)
    );
    return list.sort((a, b) => (sort === "price" ? a.price - b.price : a.departure.localeCompare(b.departure)));
  }, [query, from, directOnly, sort]);

  const fromLabel = AIRPORTS.find((a) => a.code === from)?.label ?? from;
  const fmt = (iso?: string) =>
    iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(`${iso}T12:00`)) : "";

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setQuery(to);
    const p = new URLSearchParams({ from, tripType, passengers: String(passengers) });
    if (to.trim()) p.set("to", to.trim());
    if (dates.from) p.set("depart", dates.from);
    if (tripType === "return" && dates.to) p.set("return", dates.to);
    setParams(p, { replace: true });
    document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Contact page with the request already written */
  const requestLink = (f?: Flight) => {
    const lines = [
      "Bonjour, je souhaite réserver un vol :",
      `• Trajet : ${f ? `${f.from} → ${f.to}` : `${fromLabel} → ${to.trim() || "à définir"}`}`,
      `• ${tripType === "return" ? "Aller-retour" : "Aller simple"} : ${fmt(dates.from)}${
        tripType === "return" && dates.to ? ` → ${fmt(dates.to)}` : ""
      }`,
      `• Passagers : ${passengers}`,
    ];
    if (f) lines.push(`• Vol : ${f.airline}, départ ${f.departure} (à partir de ${f.price}€)`);
    return `/contact?subject=flights&message=${encodeURIComponent(lines.join("\n"))}#contact-form`;
  };

  const nights = dates.from && dates.to ? diffDays(dates.from, dates.to) : 0;

  return (
    <Layout>
      <PageHero
        title="Réservez votre vol"
         badge="Vols directs et escales"
        breadcrumb="Vols"
      />

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 -mt-18 px-4 sm:px-6 lg:px-8">
        <form
          onSubmit={handleSearch}
          className="mx-auto max-w-[1400px] rounded-3xl border border-gray-100 bg-white p-4 shadow-2xl sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="Type de trajet" className="inline-flex rounded-full bg-gray-100 p-1">
              {(["return", "oneway"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tripType === t}
                  onClick={() => setTripType(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    tripType === t ? "bg-[#064B5C] text-white shadow" : "text-gray-700 hover:text-[#0A7C95]"
                  }`}
                >
                  {t === "return" ? "Aller-retour" : "Aller simple"}
                </button>
              ))}
            </div>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-gray-500 sm:inline-flex">
              <Luggage className="h-4 w-4 text-[#0A7C95]" aria-hidden="true" />
              Bagage cabine inclus sur la plupart des vols
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1.4fr_0.8fr_auto]">
            <label className={fieldShell}>
              <PlaneTakeoff className="h-5 w-5 shrink-0 text-[#064B5C]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={fieldLabel}>Départ</span>
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${fieldInput} cursor-pointer`}>
                  {AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            {/* Swap: destination becomes departure only when it is one of our airports */}
            <button
              type="button"
              onClick={() => {
                const back = AIRPORTS.find((a) => normalize(a.label).includes(normalize(to)) && to.trim());
                setTo(city(fromLabel));
                if (back) setFrom(back.code);
              }}
              aria-label="Inverser départ et destination"
              className="mx-auto hidden h-10 w-10 items-center justify-center self-center rounded-full border border-gray-300 text-[#064B5C] transition hover:rotate-180 hover:border-[#0A7C95] hover:text-[#0A7C95] lg:flex"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            <label className={fieldShell}>
              <PlaneLanding className="h-5 w-5 shrink-0 text-[#064B5C]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={fieldLabel}>Destination</span>
                <input
                  type="text"
                  list="vol-destinations"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Où allez-vous ?"
                  autoComplete="off"
                  className={`${fieldInput} placeholder:font-normal placeholder:text-gray-500`}
                />
                <datalist id="vol-destinations">
                  {DESTINATIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </span>
            </label>

            <DateRangePicker
              label={tripType === "return" ? "Aller → retour" : "Date de départ"}
              value={dates}
              onChange={setDates}
              min={today}
              single={tripType === "oneway"}
              minNights={0}
              lang="FR"
              badge={tripType === "return" && nights > 0 ? `${nights} j` : undefined}
            />

            <label className={fieldShell}>
              <Users className="h-5 w-5 shrink-0 text-[#064B5C]" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className={fieldLabel}>Passagers</span>
                <select
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  className={`${fieldInput} cursor-pointer`}
                >
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} passager{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <button
              type="submit"
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-7 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2 md:col-span-2 lg:col-span-1"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
              Rechercher
            </button>
          </div>
        </form>
      </section>

      {/* ── Results ────────────────────────────────────────────────────── */}
      <section id="resultats" className="scroll-mt-24 bg-[#F2F9FB] py-10 lg:py-14">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#06303A] sm:text-3xl">
                {query.trim() ? (
                  <>
                    Vols vers <span className="text-[#0A7C95]">{query.trim()}</span>
                  </>
                ) : (
                  <>
                    Vols populaires au départ de <span className="text-[#0A7C95]">{city(fromLabel)}</span>
                  </>
                )}
              </h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-[#E3A312]" aria-hidden="true" />
              <p className="mt-3 text-sm text-gray-600" aria-live="polite">
                {results.length} vol{results.length > 1 ? "s" : ""} · tarifs indicatifs par personne
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={directOnly}
                onClick={() => setDirectOnly((v) => !v)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  directOnly
                    ? "border-[#064B5C] bg-[#064B5C] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-[#0A7C95] hover:text-[#0A7C95]"
                }`}
              >
                Vols directs
              </button>
              <label className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700">
                Trier
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="cursor-pointer bg-transparent font-semibold text-[#064B5C] outline-none"
                >
                  <option value="price">Prix</option>
                  <option value="departure">Heure de départ</option>
                </select>
              </label>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#0A7C95]/30 bg-white px-6 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5F8] text-[#0A7C95]">
                <SearchX className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-[#06303A]">Aucun vol publié pour ce trajet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Nos conseillers trouvent votre billet sur toutes les compagnies. Envoyez-nous votre demande, réponse rapide.
              </p>
              <Link
                to={requestLink()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#064B5C] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0A7C95]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Demander un devis
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-4">
              {results.map((f, i) => (
                <li key={`${f.airline}-${f.departure}-${f.to}`}>
                  <article className="group rounded-3xl border border-gray-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A7C95]/30 hover:shadow-xl hover:shadow-[#064B5C]/10 sm:p-6">
                    <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-12">
                      {/* Airline */}
                      <div className="flex items-center gap-3 md:col-span-3">
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold text-white shadow-sm"
                          style={{ background: AIRLINE_COLORS[i % AIRLINE_COLORS.length] }}
                          aria-hidden="true"
                        >
                          {f.airline
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <div>
                          <p className="font-bold text-[#06303A]">{f.airline}</p>
                          <p className="text-xs text-gray-500">{f.class}</p>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex items-center gap-3 md:col-span-6">
                        <div className="text-left">
                          <p className="text-2xl font-extrabold text-[#06303A]">{f.departure}</p>
                          <p className="text-xs font-semibold text-gray-500">{code(f.from)}</p>
                        </div>
                        <div className="flex flex-1 flex-col items-center px-1">
                          <span className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock className="h-3 w-3" aria-hidden="true" /> {f.duration}
                          </span>
                          <span className="relative my-1.5 flex w-full items-center">
                            <span className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
                            <Plane
                              className="mx-1 h-4 w-4 shrink-0 text-[#0A7C95] transition-transform duration-500 group-hover:translate-x-1"
                              aria-hidden="true"
                            />
                            <span className="h-px flex-1 border-t-2 border-dashed border-gray-300" />
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              f.stops === 0 ? "bg-emerald-50 text-emerald-700" : "bg-[#FFF6DD] text-[#7A5200]"
                            }`}
                          >
                            {f.stops === 0 ? "Direct" : `${f.stops} escale`}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-extrabold text-[#06303A]">
                            {f.arrival.replace("+1", "")}
                            {f.arrival.includes("+1") && <sup className="ml-0.5 text-xs text-[#E3A312]">+1</sup>}
                          </p>
                          <p className="text-xs font-semibold text-gray-500">{code(f.to)}</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between gap-4 border-t border-dashed border-gray-200 pt-4 md:col-span-3 md:justify-end md:border-0 md:pt-0">
                        <div className="md:text-right">
                          <p className="text-[11px] text-gray-500">à partir de</p>
                          <p className="text-2xl font-extrabold text-[#0A7C95]">{f.price}€</p>
                          <p className="text-[11px] text-gray-500">{city(f.to)}</p>
                        </div>
                        <Link
                          to={requestLink(f)}
                          className="rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-3 text-sm font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
                        >
                          Demander ce vol
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Layout>
  );
}
