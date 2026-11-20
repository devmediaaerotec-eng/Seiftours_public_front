import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Armchair,
  ArrowLeftRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Crown,
  Loader2,
  Luggage,
  Mail,
  MessageSquareText,
  Phone,
  PhoneCall,
  PlaneLanding,
  PlaneTakeoff,
  Plane,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import DateRangePicker from "@/components/DateRangePicker";
import Stepper from "@/components/Stepper";
import { AGENCY } from "@/lib/agency";
import { BRANCHES, type BranchId } from "@/lib/branches";
import { addDays, fromISO, isISO, todayISO, type DateRange } from "@/lib/booking";
import {
  CABIN_LABELS,
  FlightRequestError,
  submitFlightRequest,
  type CabinClass,
  type TripType,
} from "@/lib/flightRequestApi";

/**
 * Flight page = reservation REQUEST form.
 * We have no flight search API: no results or prices are shown. The request is saved
 * (flight_requests) and an advisor calls the visitor back with the available flights and prices.
 */

// Tunisian airports (same as the home search) + suggestions for the destination
const AIRPORTS = [
  { code: "TUN", label: "Tunis-Carthage (TUN)" },
  { code: "DJE", label: "Djerba (DJE)" },
  { code: "MIR", label: "Monastir (MIR)" },
  { code: "NBE", label: "Enfidha-Hammamet (NBE)" },
  { code: "SFA", label: "Sfax (SFA)" },
];
const HERO_IMAGE = "/side-left.png";
// First ones are offered as one-click chips under the route
const DESTINATIONS = [
  "Paris", "Marseille", "Lyon", "Nice", "Istanbul", "Dubaï", "Le Caire", "Jeddah", "Médine", "Casablanca",
  "Rome", "Milan", "Bruxelles", "Francfort", "Montréal", "Londres", "Madrid", "Alger",
];

type Field =
  | "from_place" | "to_place" | "depart_date" | "return_date" | "adults" | "children" | "infants"
  | "cabin_class" | "checked_bags" | "preferred_airline" | "message"
  | "client_name" | "client_phone" | "client_email" | "branch";
type Errors = Partial<Record<Field, string>>;

const normalizePhone = (s: string) => s.replace(/[\s.\-()]/g, "").replace(/^00/, "+");
const initialFrom = (code: string | null) => AIRPORTS.find((a) => a.code === code)?.label ?? AIRPORTS[0].label;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));

// Inputs sit on a light tint so the form never looks "all white"; they turn white while focused
const shell =
  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition focus-within:bg-white focus-within:ring-2";
const shellClass = (error?: string) =>
  `${shell} ${error ? "border-red-400 bg-red-50/40 focus-within:ring-red-200" : "border-brand-600/15 bg-brand-50 hover:border-brand-600/40 focus-within:border-brand-600 focus-within:ring-brand-600/20"}`;
const fieldLabel = "block text-[11px] font-semibold uppercase leading-4 tracking-wide text-gray-500";
const fieldInput = "block w-full min-w-0 bg-transparent text-[15px] font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400";
const iconClass = "h-5 w-5 shrink-0 text-brand-600";

const CABIN_ICONS: Record<CabinClass, LucideIcon> = {
  economy: Armchair,
  premium: Sparkles,
  business: Briefcase,
  first: Crown,
};

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
      {error}
    </p>
  ) : null;
}

function Section({ step, title, icon: Icon, children }: { step: number; title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_40px_-15px_rgba(6,48,58,0.3)] ring-1 ring-brand-800/5">
      <div className="flex items-center gap-3 border-b border-brand-100 px-5 py-4 sm:px-7">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gold-600">Étape {step} sur 3</p>
          <h2 className="text-lg font-extrabold text-brand-900 sm:text-xl">{title}</h2>
        </div>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm text-gray-800 transition ${
        checked ? "border-brand-600 bg-brand-100" : "border-brand-600/15 bg-brand-50 hover:border-brand-600/40"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
      <span>{children}</span>
    </label>
  );
}

export default function VolPage() {
  const [params] = useSearchParams();
  const today = useMemo(() => todayISO(), []);

  // Prefill from the home search: /vol?from=TUN&to=Paris&tripType=return&depart=…&return=…&adults=2&children=1
  const depart = params.get("depart");
  const ret = params.get("return");
  const [tripType, setTripType] = useState<TripType>(params.get("tripType") === "oneway" ? "oneway" : "return");
  const [from, setFrom] = useState(() => initialFrom(params.get("from")));
  const [to, setTo] = useState(params.get("to") ?? "");
  const [dates, setDates] = useState<DateRange>(() => {
    const start = isISO(depart) && depart >= today ? depart : addDays(today, 7);
    return { from: start, to: isISO(ret) && ret >= start ? ret : addDays(start, 7) };
  });
  const [adults, setAdults] = useState(() => clamp(Number(params.get("adults")) || 1, 1, 9));
  const [children, setChildren] = useState(() => clamp(Number(params.get("children")) || 0, 0, 8));
  const [infants, setInfants] = useState(0);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [bags, setBags] = useState(1);
  const [directOnly, setDirectOnly] = useState(false);
  const [flexible, setFlexible] = useState(false);
  const [airline, setAirline] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState<BranchId | "">("");
  const [website, setWebsite] = useState(""); // honeypot

  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ reference: string; email: string } | null>(null);

  const total = adults + children + infants;
  const clear = (...keys: Field[]) =>
    setErrors((e) => {
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  function validate(): Errors {
    const e: Errors = {};
    if (!from.trim()) e.from_place = "Indiquez la ville ou l'aéroport de départ.";
    if (!to.trim()) e.to_place = "Indiquez votre destination.";
    else if (to.trim().toLowerCase() === from.trim().toLowerCase()) e.to_place = "La destination doit être différente du départ.";
    if (!isISO(dates.from) || dates.from < today) e.depart_date = "Choisissez une date de départ.";
    if (tripType === "return" && (!isISO(dates.to) || dates.to < (dates.from ?? ""))) e.return_date = "Choisissez une date de retour.";
    if (infants > adults) e.infants = "Pas plus de bébés que d'adultes (un bébé voyage sur les genoux d'un adulte).";
    if (total > 9) e.adults = "9 voyageurs maximum : pour un groupe, contactez-nous directement.";
    if (name.trim().length < 3) e.client_name = "Indiquez votre nom complet.";
    if (!/^\+?\d{8,15}$/.test(normalizePhone(phone))) e.client_phone = "Numéro invalide (ex. 98 123 456 ou +216 98 123 456).";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.client_email = "Adresse e-mail invalide.";
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const found = validate();
    setErrors(found);
    setSubmitError(null);
    const first = (Object.keys(found) as Field[])[0];
    if (first) {
      document.getElementById(`fl-${first}`)?.focus();
      return;
    }

    setBusy(true);
    try {
      const res = await submitFlightRequest({
        trip_type: tripType,
        from_place: from.trim(),
        to_place: to.trim(),
        depart_date: dates.from ?? "",
        return_date: tripType === "return" ? dates.to : undefined,
        adults,
        children,
        infants,
        cabin_class: cabin,
        flexible_dates: flexible,
        direct_only: directOnly,
        checked_bags: bags,
        preferred_airline: airline.trim() || undefined,
        message: message.trim() || undefined,
        client_name: name.trim(),
        client_phone: normalizePhone(phone),
        client_email: email.trim(),
        branch: branch || undefined,
        website,
      });
      setSent({ reference: res.reference, email: email.trim() });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof FlightRequestError && e.violations) {
        setErrors(e.violations as Errors);
        const key = Object.keys(e.violations)[0];
        if (key) document.getElementById(`fl-${key}`)?.focus();
      }
      setSubmitError(e instanceof FlightRequestError ? e.message : "Une erreur est survenue. Merci de réessayer.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------ request sent ------------------------------ */
  if (sent) {
    const phoneLink = AGENCY.phones[0];
    return (
      <Layout>
        <PageHero title="Demande de vol envoyée" badge="Réservation de vols" breadcrumb="Vols" image={HERO_IMAGE} imagePosition="center 20%" />
        <section className="relative z-10 -mt-18 px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-2xl sm:p-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold text-brand-900" role="status">Merci, votre demande est bien reçue !</h2>
            <p className="mt-2 text-gray-600">
              Un conseiller recherche les meilleurs vols pour votre trajet et vous contacte rapidement par téléphone ou à{" "}
              <span className="font-semibold text-gray-900">{sent.email}</span> avec les options disponibles et leurs prix.
            </p>
            <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-brand-600/20 bg-brand-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-800">Référence de votre demande</p>
              <p className="mt-1 text-2xl font-extrabold tracking-wide text-brand-600">{sent.reference}</p>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Aucun billet n'est réservé et aucun paiement n'est demandé tant que vous n'avez pas validé une proposition.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href={phoneLink.href}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-600 px-5 py-3 text-sm font-bold text-brand-600 transition hover:bg-brand-100"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {phoneLink.display}
              </a>
              <button
                type="button"
                onClick={() => setSent(null)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:text-brand-600"
              >
                Faire une autre demande
              </button>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  /* ---------------------------------- form ---------------------------------- */
  const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const showDate = (iso?: string) => (isISO(iso) ? dayFmt.format(fromISO(iso)) : "—");
  const swap = () => {
    setFrom(to);
    setTo(from);
    clear("from_place", "to_place");
  };

  return (
    <Layout>
      <PageHero
        title="Réservation de vol"
         badge="Toutes compagnies"
        breadcrumb="Vols"
        image={HERO_IMAGE}
        imagePosition="center 20%"
      >
<ul className="mt-6 mb-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/90 sm:mb-12">          {["Toutes les compagnies aériennes", "Un conseiller dédié", "Aucun paiement en ligne"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-gold-400" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </PageHero>

<section className="relative z-10 -mt-24 px-4 pb-20 sm:px-6 lg:px-8">
    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-24 -z-10 bg-brand-50" />

        {/* Soft travel backdrop: dotted flight path */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 mx-auto hidden h-64 w-full max-w-6xl text-brand-600/15 lg:block" viewBox="0 0 1200 260" fill="none">
          <path d="M20 230 C 300 20, 700 20, 1180 120" stroke="currentColor" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" />
        </svg>

  <form onSubmit={submit} noValidate className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">          {/* Honeypot: invisible to humans */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Site web
              <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <div className="space-y-6">
            {/* ------------------------------ 1. Trajet ------------------------------ */}
            <Section step={1} title="Votre trajet" icon={Plane}>
              <div role="radiogroup" aria-label="Type de trajet" className="inline-flex rounded-full bg-brand-100 p-1 ring-1 ring-brand-600/15">
                {(["return", "oneway"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tripType === t}
                    onClick={() => {
                      setTripType(t);
                      clear("return_date");
                    }}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                      tripType === t ? "bg-brand-800 text-white shadow-md" : "text-brand-800 hover:bg-white/70"
                    }`}
                  >
                    {t === "return" ? "Aller-retour" : "Aller simple"}
                  </button>
                ))}
              </div>

              <div className="relative mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start">
                <div>
                  <label className={shellClass(errors.from_place)}>
                    <PlaneTakeoff className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Départ *</span>
                      <input
                        id="fl-from_place"
                        type="text"
                        list="fl-airports"
                        value={from}
                        maxLength={120}
                        onChange={(e) => {
                          setFrom(e.target.value);
                          clear("from_place", "to_place");
                        }}
                        placeholder="Ville ou aéroport"
                        autoComplete="off"
                        aria-invalid={!!errors.from_place}
                        className={fieldInput}
                      />
                      <datalist id="fl-airports">
                        {AIRPORTS.map((a) => <option key={a.code} value={a.label} />)}
                      </datalist>
                    </span>
                  </label>
                  <FieldError id="fl-from_place" error={errors.from_place} />
                </div>

                <button
                  type="button"
                  onClick={swap}
                  aria-label="Inverser départ et destination"
                  className="absolute right-4 top-[42px] z-10 flex h-10 w-10 rotate-90 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition hover:brightness-105 md:static md:mt-2.5 md:rotate-0"
                >
                  <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <div>
                  <label className={shellClass(errors.to_place)}>
                    <PlaneLanding className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Destination *</span>
                      <input
                        id="fl-to_place"
                        type="text"
                        list="fl-destinations"
                        value={to}
                        maxLength={120}
                        onChange={(e) => {
                          setTo(e.target.value);
                          clear("to_place");
                        }}
                        placeholder="Où allez-vous ?"
                        autoComplete="off"
                        aria-invalid={!!errors.to_place}
                        className={fieldInput}
                      />
                      <datalist id="fl-destinations">
                        {DESTINATIONS.map((d) => <option key={d} value={d} />)}
                      </datalist>
                    </span>
                  </label>
                  <FieldError id="fl-to_place" error={errors.to_place} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Destinations populaires :</span>
                {DESTINATIONS.slice(0, 8).map((d) => {
                  const on = to.trim().toLowerCase() === d.toLowerCase();
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setTo(d);
                        clear("to_place");
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        on ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-800 ring-1 ring-brand-600/15 hover:bg-brand-100"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <div id="fl-depart_date" tabIndex={-1}>
                  <DateRangePicker
                    label={tripType === "return" ? "Dates aller → retour *" : "Date de départ *"}
                    value={dates}
                    onChange={(d) => {
                      setDates(d);
                      clear("depart_date", "return_date");
                    }}
                    min={today}
                    single={tripType === "oneway"}
                    minNights={0}
                    lang="FR"
                    labels={["Aller", "Retour"]}
                    unit="days"
                  />
                </div>
                <span id="fl-return_date" tabIndex={-1} />
                <FieldError id="fl-depart_date" error={errors.depart_date ?? errors.return_date} />
              </div>

              <div className="mt-3">
                <Toggle checked={flexible} onChange={setFlexible}>
                  <span className="font-semibold">Mes dates sont flexibles</span>{" "}
                  <span className="text-gray-500">(± 3 jours) : nous chercherons aussi les jours les moins chers.</span>
                </Toggle>
              </div>
            </Section>

            {/* ------------------------------ 2. Voyageurs ------------------------------ */}
            <Section step={2} title="Voyageurs et préférences" icon={Users}>
              <div className="grid gap-x-6 rounded-2xl bg-brand-50 px-4 py-2 ring-1 ring-brand-600/10 sm:grid-cols-3">
                <Stepper id="fl-adults" label="Adultes" hint="12 ans et +" value={adults} min={1} max={9}
                         onChange={(n) => { setAdults(n); clear("adults", "infants"); }} error={errors.adults} />
                <Stepper id="fl-children" label="Enfants" hint="2 à 11 ans" value={children} min={0} max={8}
                         onChange={(n) => { setChildren(n); clear("adults", "children"); }} error={errors.children} />
                <Stepper id="fl-infants" label="Bébés" hint="Moins de 2 ans" value={infants} min={0} max={4}
                         onChange={(n) => { setInfants(n); clear("adults", "infants"); }} error={errors.infants} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {total} voyageur{total > 1 ? "s" : ""} · 9 maximum par demande
              </p>

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-bold text-brand-800">Classe de voyage</legend>
                <div id="fl-cabin_class" tabIndex={-1} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(CABIN_LABELS) as CabinClass[]).map((c) => {
                    const Icon = CABIN_ICONS[c];
                    const on = cabin === c;
                    return (
                      <label
                        key={c}
                        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-sm font-bold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600/40 ${
                          on ? "border-brand-600 bg-brand-100 text-brand-800" : "border-transparent bg-brand-50 text-gray-700 hover:border-brand-600/30"
                        }`}
                      >
                        <input type="radio" name="cabin" value={c} checked={on} onChange={() => setCabin(c)} className="sr-only" />
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${on ? "bg-brand-600 text-white" : "bg-white text-brand-600"}`}>
                          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                        </span>
                        {CABIN_LABELS[c]}
                      </label>
                    );
                  })}
                </div>
                <FieldError id="fl-cabin_class" error={errors.cabin_class} />
              </fieldset>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={shellClass(errors.checked_bags)}>
                    <Luggage className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Bagages en soute (total)</span>
                      <select id="fl-checked_bags" value={bags} onChange={(e) => setBags(Number(e.target.value))}
                              className={`${fieldInput} cursor-pointer`}>
                        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                          <option key={n} value={n}>{n === 0 ? "Bagage cabine uniquement" : `${n} bagage${n > 1 ? "s" : ""}`}</option>
                        ))}
                      </select>
                    </span>
                  </label>
                  <FieldError id="fl-checked_bags" error={errors.checked_bags} />
                </div>
                <div>
                  <label className={shellClass(errors.preferred_airline)}>
                    <Plane className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Compagnie préférée (facultatif)</span>
                      <input id="fl-preferred_airline" type="text" maxLength={80} value={airline}
                             onChange={(e) => setAirline(e.target.value)} placeholder="Ex. Tunisair, Nouvelair…" className={fieldInput} />
                    </span>
                  </label>
                  <FieldError id="fl-preferred_airline" error={errors.preferred_airline} />
                </div>
              </div>

              <div className="mt-3">
                <Toggle checked={directOnly} onChange={setDirectOnly}>
                  <span className="font-semibold">Vols directs uniquement</span>
                </Toggle>
              </div>

              <div className="mt-4">
                <label htmlFor="fl-message" className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-brand-800">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                  Autres précisions <span className="font-normal text-gray-500">(facultatif)</span>
                </label>
                <textarea
                  id="fl-message"
                  rows={3}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Horaires souhaités, budget, assistance, repas spécial, Omra…"
                  className="w-full rounded-xl border border-brand-600/15 bg-brand-50 px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition hover:border-brand-600/40 focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                />
                <FieldError id="fl-message" error={errors.message} />
              </div>
            </Section>

            {/* ------------------------------ 3. Coordonnées ------------------------------ */}
            <Section step={3} title="Vos coordonnées" icon={UserRound}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={shellClass(errors.client_name)}>
                    <UserRound className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Nom complet *</span>
                      <input id="fl-client_name" type="text" autoComplete="name" maxLength={160} value={name}
                             onChange={(e) => { setName(e.target.value); clear("client_name"); }}
                             aria-invalid={!!errors.client_name} className={fieldInput} placeholder="Prénom et nom" />
                    </span>
                  </label>
                  <FieldError id="fl-client_name" error={errors.client_name} />
                </div>
                <div>
                  <label className={shellClass(errors.client_phone)}>
                    <Phone className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Téléphone *</span>
                      <input id="fl-client_phone" type="tel" autoComplete="tel" maxLength={30} value={phone}
                             onChange={(e) => { setPhone(e.target.value); clear("client_phone"); }}
                             aria-invalid={!!errors.client_phone} className={fieldInput} placeholder="+216 …" />
                    </span>
                  </label>
                  <FieldError id="fl-client_phone" error={errors.client_phone} />
                </div>
                <div>
                  <label className={shellClass(errors.client_email)}>
                    <Mail className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>E-mail *</span>
                      <input id="fl-client_email" type="email" autoComplete="email" maxLength={190} value={email}
                             onChange={(e) => { setEmail(e.target.value); clear("client_email"); }}
                             aria-invalid={!!errors.client_email} className={fieldInput} placeholder="email@exemple.com" />
                    </span>
                  </label>
                  <FieldError id="fl-client_email" error={errors.client_email} />
                </div>
                <div className="sm:col-span-2">
                  <label className={shellClass(errors.branch)}>
                    <Store className={iconClass} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={fieldLabel}>Agence la plus proche de chez vous (facultatif)</span>
                      <select id="fl-branch" value={branch} onChange={(e) => setBranch(e.target.value as BranchId | "")}
                              className={`${fieldInput} cursor-pointer`}>
                        <option value="">Pas de préférence</option>
                        {BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </span>
                  </label>
                  <FieldError id="fl-branch" error={errors.branch} />
                </div>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Vos coordonnées servent uniquement à vous recontacter au sujet de cette demande.
              </p>
            </Section>

            {submitError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600 ring-1 ring-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {submitError}
              </p>
            )}

            {/* Submit band */}
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-brand-900 p-6 text-center shadow-xl sm:flex-row sm:justify-between sm:p-7 sm:text-left">
              <div>
                <p className="text-lg font-extrabold text-white">Prêt à décoller ?</p>
                <p className="mt-0.5 text-sm text-white/75">Gratuit et sans engagement · Réponse rapide de nos conseillers</p>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="flex min-h-[56px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gold-500 px-7 text-base font-extrabold text-brand-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
                Envoyer ma demande de vol
              </button>
            </div>
          </div>

          {/* ------------------------- Live summary (desktop: sticky) ------------------------- */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl bg-brand-900 text-white shadow-xl">
              <div className="bg-[radial-gradient(circle_at_top_right,rgba(242,183,5,0.25),transparent_60%)] p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-400">Votre demande</p>
                <div className="mt-4 flex items-center gap-3">
                  <p className="min-w-0 flex-1 break-words text-base font-extrabold leading-snug line-clamp-2" title={from}>{from.trim() || "Départ"}</p>
                  <Plane className="h-5 w-5 shrink-0 text-gold-400" aria-hidden="true" />
                  <p className="min-w-0 flex-1 break-words text-right text-base font-extrabold leading-snug line-clamp-2" title={to}>{to.trim() || "Destination"}</p>
                </div>
                <p className="mt-1 text-xs text-white/60">{tripType === "return" ? "Aller-retour" : "Aller simple"}</p>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Dates</dt>
                      <dd>
                        Aller : <span className="font-semibold">{showDate(dates.from)}</span>
                        {tripType === "return" && (
                          <span className="block">Retour : <span className="font-semibold">{showDate(dates.to)}</span></span>
                        )}
                        {flexible && <span className="block text-xs text-white/60">Dates flexibles ± 3 jours</span>}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Voyageurs</dt>
                      <dd className="font-semibold">
                        {adults} adulte{adults > 1 ? "s" : ""}
                        {children > 0 && `, ${children} enfant${children > 1 ? "s" : ""}`}
                        {infants > 0 && `, ${infants} bébé${infants > 1 ? "s" : ""}`}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Armchair className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                    <div>
                      <dt className="sr-only">Classe et bagages</dt>
                      <dd>
                        <span className="font-semibold">{CABIN_LABELS[cabin]}</span>
                        <span className="text-white/70"> · {bags === 0 ? "cabine uniquement" : `${bags} bagage${bags > 1 ? "s" : ""}`}</span>
                        {directOnly && <span className="block text-xs text-white/60">Vols directs uniquement</span>}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
              <div className="border-t border-white/10 bg-white/5 px-6 py-4 text-sm">
                <p className="flex items-start gap-2 text-white/85">
                  <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" />
                  Un conseiller vous rappelle avec les vols disponibles et leurs prix.
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white/80 p-5 shadow-sm ring-1 ring-brand-800/10 backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-bold text-brand-800">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Aucun paiement en ligne
              </p>
              <p className="mt-1 text-xs text-gray-600">Rien n'est réservé ni payé tant que vous n'avez pas validé une proposition.</p>
              <a
                href={AGENCY.phones[0].href}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-brand-600 px-4 py-2.5 text-sm font-bold text-brand-600 transition hover:bg-brand-100"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {AGENCY.phones[0].display}
              </a>
            </div>
          </aside>
        </form>
      </section>
    </Layout>
  );
}
