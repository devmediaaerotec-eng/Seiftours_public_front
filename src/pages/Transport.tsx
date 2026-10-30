import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle, ArrowRight, Briefcase, Bus, BusFront, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Expand, GraduationCap, ImageOff, Loader2, Mail, MapPin, Map as MapIcon, PartyPopper, Phone, Plane,
  RefreshCw, Route as RouteIcon, Send, ShieldCheck, Sparkles, UserRound, Users, X,
} from "lucide-react";
import Layout from "@/components/Layout";
import { AGENCY } from "@/lib/agency";
import {
  assetUrl, submitTransportRequest, TransportRequestError, usePublicFleet,
  type BusType, type FleetBus, type Purpose, type Vehicle,
} from "@/hooks/usePublicFleet";

/* ------------------------------------------------------------------ constantes */

const TYPE_LABEL: Record<BusType, string> = { minibus: "Minibus", microbus: "Microbus" };
const TYPE_ICON = { minibus: Bus, microbus: BusFront } as const;

const CONTACT_LINK =
  "/contact?subject=transport&message=" +
  encodeURIComponent("Bonjour, je souhaite des renseignements sur la location de bus.") +
  "#contact-form";

const SERVICES = [
  { icon: PartyPopper, title: "Mariages et événements", text: "Acheminez vos invités ensemble et à l'heure, sans souci de stationnement." },
  { icon: MapIcon, title: "Excursions et visites", text: "Journées découverte, sites historiques, sorties entre amis ou en famille." },
  { icon: Plane, title: "Transferts aéroport", text: "Transfert de groupes entre l'aéroport, l'hôtel et les sites de visite." },
  { icon: GraduationCap, title: "Sorties scolaires", text: "Voyages de classe et sorties éducatives pour les établissements." },
  { icon: Briefcase, title: "Séminaires et entreprises", text: "Navettes pour vos équipes, congrès et déplacements professionnels." },
  { icon: RouteIcon, title: "Circuits de groupe", text: "Itinéraires sur plusieurs jours, adaptés à la taille de votre groupe." },
];

const STEPS = [
  { icon: CalendarDays, title: "Décrivez votre trajet", text: "Indiquez les dates, les horaires, le lieu de départ et le nombre de passagers." },
  { icon: Phone, title: "Recevez votre devis", text: "Nous vous contactons pour confirmer la disponibilité et le tarif." },
  { icon: ShieldCheck, title: "Voyagez sereinement", text: "Votre bus et votre chauffeur vous attendent à l'heure convenue." },
];

const PURPOSES: [Purpose, string][] = [
  ["wedding", "Mariage / événement"],
  ["excursion", "Excursion / visite"],
  ["airport", "Transfert aéroport"],
  ["school", "Sortie scolaire"],
  ["seminar", "Séminaire / entreprise"],
  ["circuit", "Circuit / voyage de groupe"],
  ["other", "Autre besoin"],
];

/* ------------------------------------------------------------------ formulaire : utilitaires */

interface FormState {
  purpose: Purpose;
  pax: string;
  pickup: string;
  destination: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  website: string;
}
type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  purpose: "other", pax: "", pickup: "", destination: "", startDate: "", startTime: "",
  endDate: "", endTime: "", name: "", phone: "", email: "", message: "", website: "",
};

const FIELD_ORDER: (keyof FormState)[] = [
  "pickup", "destination", "startDate", "startTime", "endDate", "endTime", "pax", "name", "phone", "email", "message",
];

/** Clés renvoyées par le serveur -> champs du formulaire */
const SERVER_FIELD: Record<string, keyof FormState> = {
  pickup_place: "pickup", destination: "destination", starts_at: "startDate", ends_at: "endDate", pax: "pax",
  client_name: "name", client_phone: "phone", client_email: "email", message: "message", purpose: "purpose",
};

function tunisNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** 98123456 -> +21698123456 ; 0021698... -> +21698... */
function normalizePhone(raw: string) {
  const p = raw.replace(/[\s.\-()]/g, "");
  if (/^\d{8}$/.test(p)) return `+216${p}`;
  if (p.startsWith("00")) return `+${p.slice(2)}`;
  return p;
}

const toMs = (d: string, t: string) => new Date(`${d}T${t}:00Z`).getTime();

function durationText(f: FormState) {
  if (!f.startDate || !f.startTime || !f.endDate || !f.endTime) return null;
  const mins = Math.round((toMs(f.endDate, f.endTime) - toMs(f.startDate, f.startTime)) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  return [days ? `${days} j` : "", hours ? `${hours} h` : "", !days && rest ? `${rest} min` : ""].filter(Boolean).join(" ");
}

function validate(f: FormState): Errors {
  const e: Errors = {};
  const now = tunisNow();
  if (!/^\d+$/.test(f.pax.trim()) || Number(f.pax) < 1 || Number(f.pax) > 90) e.pax = "Indiquez un nombre de passagers entre 1 et 90.";
  if (!f.pickup.trim()) e.pickup = "Indiquez le lieu de départ.";
  if (!f.destination.trim()) e.destination = "Indiquez la destination.";

  if (!f.startDate) e.startDate = "Choisissez la date de départ.";
  else if (f.startDate < now.date) e.startDate = "Cette date est passée.";
  if (!f.startTime) e.startTime = "Indiquez l'heure de départ.";
  if (!f.endDate) e.endDate = "Choisissez la date d'arrivée.";
  else if (f.startDate && f.endDate < f.startDate) e.endDate = "L'arrivée ne peut pas précéder le départ.";
  if (!f.endTime) e.endTime = "Indiquez l'heure d'arrivée.";

  if (!e.startDate && !e.startTime && `${f.startDate} ${f.startTime}` <= `${now.date} ${now.time}`) {
    e.startTime = "Le départ doit être dans le futur.";
  }
  if (!e.startDate && !e.startTime && !e.endDate && !e.endTime) {
    const diff = toMs(f.endDate, f.endTime) - toMs(f.startDate, f.startTime);
    if (diff <= 0) e.endTime = "L'arrivée doit être après le départ.";
    else if (diff > 90 * 86400000) e.endDate = "90 jours maximum : appelez-nous pour une demande plus longue.";
  }

  if (f.name.trim().length < 2) e.name = "Indiquez votre nom.";
  if (!/^\+\d{8,15}$/.test(normalizePhone(f.phone))) e.phone = "Numéro invalide (ex. 98 123 456 ou +216 98 123 456).";
  if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Adresse e-mail invalide.";
  if (f.message.length > 2000) e.message = "2000 caractères maximum.";
  return e;
}

const inputCls = (err?: string) =>
  `mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
    err ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-gray-300 focus:border-[#0A7C95] focus:ring-[#0A7C95]/25"
  }`;

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 flex items-start gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Bus; children: ReactNode }) {
  return (
    <h3 className="mb-3 mt-7 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-bold text-[#06303A] first:mt-0">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F5F8] text-[#0A7C95]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ formulaire de devis */

interface QuoteFormProps {
  vehicle: Vehicle;
  onVehicle: (v: Vehicle) => void;
  counts: Record<BusType, { count: number; min: number | null; max: number | null }>;
  maxSeats: number | null;
}

function QuoteForm({ vehicle, onVehicle, counts, maxSeats }: QuoteFormProps) {
  const [f, setF] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [formError, setFormError] = useState("");
  const [reference, setReference] = useState("");
  const today = tunisNow().date;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setF((p) => ({ ...p, [key]: value }));
    setErrors((p) => (p[key] ? { ...p, [key]: undefined } : p));
  };
  const bind = (key: keyof FormState) => ({
    id: `tr-${key}`,
    value: f[key],
    onChange: (ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, ev.target.value as never),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `tr-${key}-err` : undefined,
    className: inputCls(errors[key]),
  });

  const onStartDate = (ev: ChangeEvent<HTMLInputElement>) => {
    const v = ev.target.value;
    setF((p) => ({ ...p, startDate: v, endDate: !p.endDate || p.endDate < v ? v : p.endDate }));
    setErrors((p) => ({ ...p, startDate: undefined }));
  };

  const duration = durationText(f);
  const tooBig = maxSeats !== null && /^\d+$/.test(f.pax) && Number(f.pax) > maxSeats;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (state === "sending") return;
    setFormError("");
    const e = validate(f);
    setErrors(e);
    const first = FIELD_ORDER.find((k) => e[k]);
    if (first) {
      document.getElementById(`tr-${first}`)?.focus();
      return;
    }

    setState("sending");
    try {
      const res = await submitTransportRequest({
        vehicle_pref: vehicle, purpose: f.purpose, pax: Number(f.pax),
        starts_at: `${f.startDate} ${f.startTime}`, ends_at: `${f.endDate} ${f.endTime}`,
        pickup_place: f.pickup.trim(), destination: f.destination.trim(),
        client_name: f.name.trim(), client_phone: normalizePhone(f.phone), client_email: f.email.trim(),
        message: f.message.trim(), website: f.website,
      });
      setReference(res.reference);
      setState("done");
      document.getElementById("devis")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setState("idle");
      if (err instanceof TransportRequestError) {
        if (err.violations) {
          const mapped: Errors = {};
          Object.entries(err.violations).forEach(([k, msg]) => {
            const key = SERVER_FIELD[k];
            if (key) mapped[key] = msg;
          });
          setErrors(mapped);
          const firstKey = FIELD_ORDER.find((k) => mapped[k]);
          if (firstKey) document.getElementById(`tr-${firstKey}`)?.focus();
        }
        setFormError(err.message);
      } else {
        setFormError("Une erreur est survenue. Réessayez ou appelez-nous.");
      }
    }
  };

  const reset = () => {
    setF(EMPTY);
    setErrors({});
    setReference("");
    setState("idle");
  };

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-gray-200 sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-2xl font-bold text-[#06303A]">Votre demande est envoyée</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          Merci {f.name.trim().split(" ")[0]}. Notre équipe vérifie la disponibilité des véhicules et vous recontacte au{" "}
          <strong className="whitespace-nowrap">{normalizePhone(f.phone)}</strong> avec un devis.
        </p>
        <div className="mx-auto mt-6 inline-block rounded-xl border border-dashed border-[#E3A312] bg-[#FFF6DD] px-6 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-[#7A5200]">Référence de votre demande</p>
          <p className="mt-0.5 select-all font-mono text-xl font-bold tracking-widest text-[#06303A]">{reference}</p>
        </div>
        <p className="mt-3 text-xs text-gray-500">Conservez cette référence : elle vous sera demandée si vous nous appelez.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={AGENCY.phones[0].href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A7C95] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#064B5C]">
            <Phone className="h-4 w-4" aria-hidden="true" /> {AGENCY.phones[0].display}
          </a>
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#0A7C95] hover:text-[#0A7C95]">
            Faire une autre demande
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-gray-200 sm:p-8">
      {/* Champ piège anti-robots : invisible pour les humains */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Site web<input type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={(ev) => set("website", ev.target.value)} /></label>
      </div>

      <SectionTitle icon={MapPin}>Votre trajet</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tr-pickup" label="Lieu de départ *" error={errors.pickup}>
          <input {...bind("pickup")} placeholder="Ex. Sousse, hôtel, aéroport…" autoComplete="off" />
        </Field>
        <Field id="tr-destination" label="Destination *" error={errors.destination}>
          <input {...bind("destination")} placeholder="Ex. Tozeur, Mahdia…" autoComplete="off" />
        </Field>
      </div>

      <SectionTitle icon={CalendarDays}>Période et horaires souhaités</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tr-startDate" label="Date de départ *" error={errors.startDate}>
          <input {...bind("startDate")} type="date" min={today} onChange={onStartDate} />
        </Field>
        <Field id="tr-startTime" label="Heure de départ *" error={errors.startTime}>
          <input {...bind("startTime")} type="time" />
        </Field>
        <Field id="tr-endDate" label="Date d'arrivée / retour *" error={errors.endDate}>
          <input {...bind("endDate")} type="date" min={f.startDate || today} />
        </Field>
        <Field id="tr-endTime" label="Heure d'arrivée / retour *" error={errors.endTime}>
          <input {...bind("endTime")} type="time" />
        </Field>
      </div>
      {duration && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-3 py-1 text-xs font-medium text-[#064B5C]">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Durée de la location : {duration}
        </p>
      )}

      <SectionTitle icon={Users}>Votre groupe</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tr-pax" label="Nombre de passagers *" error={errors.pax}
               hint={tooBig ? `Au-delà de ${maxSeats} places, nous étudierons une solution avec plusieurs véhicules.` : undefined}>
          <input {...bind("pax")} inputMode="numeric" placeholder="Ex. 30" />
        </Field>
        <Field id="tr-purpose" label="Type de déplacement" error={errors.purpose}>
          <select {...bind("purpose")}>
            {PURPOSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-gray-800">Véhicule souhaité</legend>
        <div role="radiogroup" className="mt-1.5 grid gap-2 sm:grid-cols-3">
          {([
            ["any", "Peu importe", Sparkles, "Nous vous conseillons"],
            ["minibus", "Minibus", Bus, counts.minibus.max ? `jusqu'à ${counts.minibus.max} places` : "grands groupes"],
            ["microbus", "Microbus", BusFront, counts.microbus.max ? `jusqu'à ${counts.microbus.max} places` : "petits groupes"],
          ] as [Vehicle, string, typeof Bus, string][]).map(([value, label, Icon, hint]) => (
            <button key={value} type="button" role="radio" aria-checked={vehicle === value} onClick={() => onVehicle(value)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      vehicle === value ? "border-[#0A7C95] bg-[#E8F5F8] ring-1 ring-[#0A7C95]" : "border-gray-200 hover:border-[#0A7C95]/60"}`}>
              <Icon className={`h-5 w-5 shrink-0 ${vehicle === value ? "text-[#0A7C95]" : "text-gray-400"}`} aria-hidden="true" />
              <span><span className="block text-sm font-semibold text-[#06303A]">{label}</span><span className="block text-xs text-gray-500">{hint}</span></span>
            </button>
          ))}
        </div>
      </fieldset>

      <SectionTitle icon={UserRound}>Vos coordonnées</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="tr-name" label="Nom et prénom *" error={errors.name}>
          <input {...bind("name")} autoComplete="name" />
        </Field>
        <Field id="tr-phone" label="Téléphone *" error={errors.phone} hint="8 chiffres : +216 est ajouté automatiquement.">
          <input {...bind("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="98 123 456" />
        </Field>
     
        
      </div>

      {formError && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-inset ring-red-600/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {formError}
        </div>
      )}

      <button type="submit" disabled={state === "sending"}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
        {state === "sending" ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Envoi en cours…</> : <><Send className="h-5 w-5" aria-hidden="true" /> Envoyer ma demande de devis</>}
      </button>
      <p className="mt-3 text-center text-xs text-gray-500">
        Gratuit et sans engagement. Vos informations servent uniquement à répondre à votre demande.
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ flotte et visionneuse */

function BusCard({ bus, photoIndex, onOpen, onRequest }: { bus: FleetBus; photoIndex: number; onOpen: (i: number) => void; onRequest: (t: BusType) => void }) {
  const Icon = TYPE_ICON[bus.bus_type];
  const subtitle = [bus.brand, bus.model].filter(Boolean).join(" ");
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {bus.image_url ? (
          <button type="button" onClick={() => onOpen(photoIndex)} aria-label={`Agrandir la photo : ${TYPE_LABEL[bus.bus_type]} ${bus.seats} places`} className="block h-full w-full">
            <img src={assetUrl(bus.image_url)} alt={`${TYPE_LABEL[bus.bus_type]} ${bus.seats} places`} loading="lazy" decoding="async"
                 className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#06303A] opacity-0 shadow transition group-hover:opacity-100">
              <Expand className="h-3.5 w-3.5" aria-hidden="true" /> Agrandir
            </span>
          </button>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#E8F5F8] to-[#C9E8EF] text-[#0A7C95]/50">
            <ImageOff className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xs font-medium">Photo bientôt disponible</span>
          </div>
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#064B5C] shadow-sm">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {TYPE_LABEL[bus.bus_type]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-[#06303A]">{TYPE_LABEL[bus.bus_type]} {bus.seats} places</h3>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        <ul className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#064B5C]">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-2.5 py-1"><Users className="h-3.5 w-3.5" aria-hidden="true" /> {bus.seats} passagers</li>
          {bus.year_made && <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-2.5 py-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {bus.year_made}</li>}
          <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-2.5 py-1"><UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Avec chauffeur</li>
        </ul>
        <button type="button" onClick={() => onRequest(bus.bus_type)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#0A7C95] px-4 py-2.5 text-sm font-semibold text-[#0A7C95] transition hover:bg-[#0A7C95] hover:text-white">
          Demander ce type de véhicule <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function Lightbox({ photos, index, onChange, onClose }: { photos: FleetBus[]; index: number; onChange: (i: number) => void; onClose: () => void }) {
  useEffect(() => {
    const total = photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onChange((index + 1) % total);
      if (e.key === "ArrowLeft") onChange((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, photos.length, onChange, onClose]);

  const bus = photos[index];
  if (!bus) return null;
  const go = (d: number) => onChange((index + d + photos.length) % photos.length);
  const caption = `${TYPE_LABEL[bus.bus_type]} ${bus.seats} places`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Galerie des véhicules" className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen flex-col bg-black/95" onClick={onClose}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm tabular-nums text-white/80">{index + 1} / {photos.length} · {caption}</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        <img src={assetUrl(bus.image_url)} alt={caption} onClick={(e) => e.stopPropagation()}
             className="block h-auto w-auto min-w-0 max-w-full rounded-lg object-contain max-h-[calc(100dvh-11rem)]" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/30 sm:left-4"><ChevronLeft className="h-6 w-6" aria-hidden="true" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/30 sm:right-4"><ChevronRight className="h-6 w-6" aria-hidden="true" /></button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {photos.map((p, i) => (
            <button key={p.id} type="button" onClick={() => onChange(i)} aria-label={`Voir la photo ${i + 1}`} aria-current={i === index}
                    className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${i === index ? "border-[#F2B705]" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <img src={assetUrl(p.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}


/* ------------------------------------------------------------------ hero carousel */

function HeroCarousel({ photos, onOpen }: { photos: FleetBus[]; onOpen: (i: number) => void }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = photos.length;

  /* Autoplay toutes les 4s, pause au survol */
  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => setActive((i) => (i + 1) % count), 4000);
    return () => clearInterval(id);
  }, [paused, count]);

  /* Navigation clavier */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((i) => (i + 1) % count);
    if (e.key === "ArrowLeft") setActive((i) => (i - 1 + count) % count);
  };

  const go = (i: number) => setActive(((i % count) + count) % count);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Photos de la flotte"
    >
      {/* Grande image principale */}

<div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/20">
        {photos.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Agrandir la photo ${i + 1}`}
            aria-hidden={i !== active}
            tabIndex={i === active ? 0 : -1}
            className={`absolute inset-0 block h-full w-full cursor-zoom-in transition-opacity duration-700 ease-out ${
              i === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <img
              src={assetUrl(b.image_url)}
              alt={`${TYPE_LABEL[b.bus_type]} ${b.seats} places`}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "auto"}
              className="h-full w-full object-cover"
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#06303A]/70 to-transparent" />
          </button>
        ))}

        {/* Badges */}
        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-md">
            {TYPE_LABEL[photos[active].bus_type]}
          </span>
          <span className="rounded-full bg-[#F2B705] px-3 py-1 text-xs font-bold text-[#06303A]">
            {photos[active].seats} places
          </span>
        </div>

        {/* Flèches */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/25"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Points */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#06303A]/60 px-3 py-1.5 ring-1 ring-white/20 backdrop-blur-md">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Aller à la photo ${i + 1}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-6 bg-[#F2B705]" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Vignettes qui défilent */}
      {count > 1 && (
        <div className="mt-4 overflow-hidden">
          <div
            className="flex gap-3"
            style={{
              width: "max-content",
              animation: paused ? "none" : "hero-marquee 22s linear infinite",
            }}
          >
            {[...photos, ...photos].map((b, i) => {
              const realIndex = i % count;
              const isActive = realIndex === active;
              return (
                <button
                  key={`${b.id}-${i}`}
                  type="button"
                  onClick={() => go(realIndex)}
                  aria-label={`Voir ${TYPE_LABEL[b.bus_type]} ${b.seats} places`}
                  className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 transition duration-300 ${
                    isActive
                      ? "ring-2 ring-[#F2B705] shadow-lg shadow-[#F2B705]/20"
                      : "ring-white/20 opacity-70 hover:opacity-100 hover:ring-white/40"
                  }`}
                >
                  <img src={assetUrl(b.image_url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#06303A]/50 to-transparent" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes hero-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="hero-marquee"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}


/* ------------------------------------------------------------------ page */

export default function TransportPage() {
  const { data, loading, error, retry } = usePublicFleet();
  const { hash } = useLocation();
  const [filter, setFilter] = useState<"all" | BusType>("all");
  const [vehicle, setVehicle] = useState<Vehicle>("any");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const buses = data?.buses ?? [];
  const photos = useMemo(() => buses.filter((b) => b.image_url), [buses]);
  const photoIndex = useMemo(() => new Map(photos.map((b, i) => [b.id, i])), [photos]);
  const shown = filter === "all" ? buses : buses.filter((b) => b.bus_type === filter);

  const seats = buses.map((b) => b.seats);
  const minSeats = seats.length ? Math.min(...seats) : null;
  const maxSeats = seats.length ? Math.max(...seats) : null;
  const counts = {
    minibus: { count: data?.summary.minibus.count ?? 0, min: data?.summary.minibus.min_seats ?? null, max: data?.summary.minibus.max_seats ?? null },
    microbus: { count: data?.summary.microbus.count ?? 0, min: data?.summary.microbus.min_seats ?? null, max: data?.summary.microbus.max_seats ?? null },
  };


  

  useEffect(() => {
    const previous = document.title;
    document.title = "Location de bus et minibus avec chauffeur | Seif Tours";
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, loading]);

  const requestType = (t: BusType) => {
    setVehicle(t);
    document.getElementById("devis")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heroPhotos = photos.slice(0, 3);

  return (
    <Layout>
      {/* ───────────── Bandeau d'accueil ───────────── */}
    
    {/* ───────────── Bandeau d'accueil ───────────── */}
<section className="relative overflow-hidden bg-gradient-to-br from-[#06303A] via-[#064B5C] to-[#0A7C95] text-white">
  {/* Décors flous */}
  <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#F2B705]/10 blur-3xl" />
  <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
  {/* Grille lumineuse subtile */}
 

  <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
    {/* ───── Colonne texte ───── */}
    <div>
      <nav aria-label="Fil d'Ariane" className="mb-5 flex items-center gap-1.5 text-xs text-white/70">
        <Link to="/" className="hover:text-white">Accueil</Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-white">Transport</span>
      </nav>
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-[#F2B705] ring-1 ring-white/20 backdrop-blur-sm">
        <Bus className="h-4 w-4" aria-hidden="true" /> Location de bus
      </p>
      <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
        Location de bus et minibus <span className="text-[#F2B705]">avec chauffeur</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
        Seif Tours met à votre disposition une flotte de minibus et de microbus pour vos mariages, excursions, transferts
        aéroport, sorties scolaires et déplacements professionnels. Contactez-nous : nous vous répondons avec un devis adapté à votre trajet.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href="#devis" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-base font-bold text-[#06303A] shadow-lg transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#064B5C]">
          Demander un devis <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </a>
        <Link to={CONTACT_LINK} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/40 px-6 text-base font-semibold text-white transition hover:bg-white/10">
          <Mail className="h-5 w-5" aria-hidden="true" /> Nous contacter
        </Link>
      </div>
      <a href={AGENCY.phones[0].href} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white">
        <Phone className="h-4 w-4" aria-hidden="true" /> Ou appelez-nous : <span className="font-bold">{AGENCY.phones[0].display}</span>
      </a>

      {buses.length > 0 && (
        <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-6">
          <div><dt className="text-xs text-white/60">Véhicules</dt><dd className="mt-0.5 text-2xl font-bold">{buses.length}</dd></div>
          <div><dt className="text-xs text-white/60">Capacité</dt><dd className="mt-0.5 text-2xl font-bold">{minSeats === maxSeats ? maxSeats : `${minSeats}–${maxSeats}`}<span className="text-sm font-medium text-white/70"> places</span></dd></div>
          <div><dt className="text-xs text-white/60">Chauffeur</dt><dd className="mt-0.5 text-2xl font-bold">Inclus</dd></div>
        </dl>
      )}
    </div>

  
  {/* ───── Colonne visuelle : grande image + vignettes qui défilent ───── */}
<div className="relative hidden lg:block">
  {heroPhotos.length > 0 ? (
    <HeroCarousel photos={heroPhotos} onOpen={(i) => setLightbox(i)} />
  ) : (
    <div className="flex h-[340px] items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/15">
      <BusFront className="h-24 w-24 text-white/25" strokeWidth={1} aria-hidden="true" />
    </div>
  )}
</div>
  </div>
</section>
  {/* ───────────── Pour quels besoins ───────────── */}
<section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F7FCFD] to-white py-14 lg:py-20">
  {/* Décors de fond discrets */}
  <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#0A7C95]/5 blur-3xl" />
  <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-[#F2B705]/10 blur-3xl" />

  <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
    {/* En-tête */}
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E8F5F8] px-3.5 py-1.5 text-xs font-semibold text-[#0A7C95] ring-1 ring-[#0A7C95]/15">
        <Bus className="h-4 w-4" aria-hidden="true" />
        Nos occasions
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight text-[#06303A] sm:text-3xl lg:text-4xl">
        Un bus pour <span className="text-[#0A7C95]">chaque occasion</span>
      </h2>
      <p className="mt-3 text-gray-600">
        Quelle que soit la taille de votre groupe, nous trouvons le véhicule qui convient à votre déplacement.
      </p>
    </div>

    {/* Grille des occasions — 6 sur une ligne en xl */}
    <ul
      className="
        mt-12
        flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4
        [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0
        lg:grid-cols-3
        xl:grid-cols-6 xl:gap-3
      "
    >
      {SERVICES.map(({ icon: Icon, title, text }, i) => (
        <li
          key={title}
          className="
            group relative flex w-[260px] shrink-0 snap-start flex-col
            rounded-2xl border border-gray-200/80 bg-white p-5
            shadow-[0_1px_2px_rgba(6,48,58,0.04)]
            transition duration-300
            hover:-translate-y-1 hover:border-[#0A7C95]/40
            hover:shadow-[0_12px_28px_-12px_rgba(10,124,149,0.35)]
            sm:w-auto
          "
        >
          {/* Liseré animé en haut au survol */}
          <span className="absolute inset-x-5 top-0 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-[#F28C0F] to-[#F2B705] transition-transform duration-300 group-hover:scale-x-100" />

          {/* Icône */}
          <span className="
            relative flex h-12 w-12 items-center justify-center rounded-xl
            bg-gradient-to-br from-[#E8F5F8] to-[#D5EEF4]
            text-[#0A7C95] ring-1 ring-[#0A7C95]/10
            transition duration-300
            group-hover:from-[#0A7C95] group-hover:to-[#064B5C]
            group-hover:text-white group-hover:ring-[#0A7C95]
          ">
            <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={1.8} />
          </span>

          {/* Numérotation discrète */}
          <span className="
            absolute right-4 top-4 text-[11px] font-bold tabular-nums
            text-gray-300 transition group-hover:text-[#F2B705]
          ">
            {String(i + 1).padStart(2, "0")}
          </span>

          {/* Texte */}
          <h3 className="mt-4 text-[15px] font-bold leading-snug text-[#06303A]">
            {title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
            {text}
          </p>
        </li>
      ))}
    </ul>

    {/* Indication de scroll mobile */}
    <p className="mt-3 text-center text-xs text-gray-400 sm:hidden">
      ← Faites glisser pour voir toutes les occasions →
    </p>
  </div>
</section>

      {/* ───────────── Notre flotte ───────────── */}
      <section id="flotte" className="scroll-mt-24 bg-[#F2F9FB] py-14 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#06303A] sm:text-3xl">Notre flotte</h2>
              <p className="mt-2 max-w-xl text-gray-600">Des véhicules entretenus, conduits par des chauffeurs professionnels. Cliquez sur une photo pour l'agrandir.</p>
            </div>
            {buses.length > 0 && (
              <div role="tablist" aria-label="Filtrer par type de véhicule" className="inline-flex w-full rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200 sm:w-auto">
                {([["all", "Tous", buses.length], ["minibus", "Minibus", counts.minibus.count], ["microbus", "Microbus", counts.microbus.count]] as ["all" | BusType, string, number][])
                  .filter(([k, , n]) => k === "all" || n > 0)
                  .map(([k, label, n]) => (
                    <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${filter === k ? "bg-[#0A7C95] text-white shadow-sm" : "text-gray-600 hover:text-[#0A7C95]"}`}>
                      {label} <span className={filter === k ? "text-white/80" : "text-gray-400"}>({n})</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-2xl bg-gray-200/70" />)}
            </div>
          )}

          {error && !loading && (
            <div className="mt-8 flex flex-col items-center rounded-2xl bg-white p-8 text-center ring-1 ring-gray-200">
              <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
              <p className="mt-3 font-semibold text-[#06303A]">Impossible de charger la flotte</p>
              <p className="mt-1 text-sm text-gray-500">Vous pouvez tout de même nous envoyer votre demande ci-dessous.</p>
              <button type="button" onClick={retry} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#0A7C95] hover:text-[#0A7C95]">
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Réessayer
              </button>
            </div>
          )}

          {!loading && !error && buses.length === 0 && (
            <div className="mt-8 rounded-2xl bg-white p-10 text-center ring-1 ring-gray-200">
              <BusFront className="mx-auto h-10 w-10 text-[#0A7C95]/40" aria-hidden="true" />
              <p className="mt-3 font-semibold text-[#06303A]">Notre flotte sera bientôt présentée ici</p>
              <p className="mt-1 text-sm text-gray-500">En attendant, décrivez votre besoin : nous vous proposons le véhicule adapté.</p>
            </div>
          )}

          {shown.length > 0 && (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((b) => (
                <BusCard key={b.id} bus={b} photoIndex={photoIndex.get(b.id) ?? -1} onOpen={(i) => i >= 0 && setLightbox(i)} onRequest={requestType} />
              ))}
            </div>
          )}
        </div>
      </section>
 

      {/* ───────────── Demande de devis ───────────── */}
   
   {/* ───────────── Demande de devis ───────────── */}
<section
  id="devis"
  className="scroll-mt-20 relative overflow-hidden bg-gradient-to-b from-[#F7FCFD] via-white to-[#F7FCFD] py-16 lg:py-24"
>
  {/* Décors très discrets */}
  <div className="pointer-events-none absolute -left-32 top-40 h-80 w-80 rounded-full bg-[#0A7C95]/5 blur-3xl" />
  <div className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-[#F2B705]/8 blur-3xl" />

  <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
    {/* ───── En-tête ───── */}
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0A7C95]/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0A7C95] shadow-sm">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Réponse sous 24 h
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight text-[#06303A] sm:text-3xl lg:text-4xl">
        Demandez votre <span className="text-[#0A7C95]">devis gratuit</span>
      </h2>
      <p className="mt-3 text-gray-600">
        Indiquez votre trajet, vos dates et vos horaires. Nous revenons vers vous avec une proposition adaptée, sans engagement.
      </p>
    </div>

    {/* ───── Grille 2 colonnes ───── */}
    <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-12 lg:items-start">
      {/* ═══ Colonne gauche : réassurance sobre ═══ */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {/* Étapes numérotées — style editorial */}
        <ol className="space-y-5">
          {[
            {
              icon: MapPin,
              title: "Décrivez votre trajet",
              text: "Départ, destination, dates et nombre de passagers. Tout se fait en un seul formulaire.",
            },
            {
              icon: Phone,
              title: "Nous vous rappelons",
              text: "Un conseiller vérifie la disponibilité et confirme le tarif avec vous.",
            },
            {
              icon: CheckCircle2,
              title: "Vous recevez le devis",
              text: "Proposition claire, chauffeur inclus. Vous décidez ensuite, sans pression.",
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="group relative flex gap-4">
              {/* Ligne verticale entre étapes */}
              {i < 2 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[19px] top-11 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[#0A7C95]/30 to-transparent"
                />
              )}
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0A7C95]/20 bg-white text-[#0A7C95] shadow-sm transition group-hover:border-[#0A7C95] group-hover:bg-[#E8F5F8]">
                <Icon className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={1.8} />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F2B705] text-[10px] font-bold text-[#06303A]">
                  {i + 1}
                </span>
              </span>
              <div className="pt-0.5">
                <h3 className="text-[15px] font-bold text-[#06303A]">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Bloc contact — léger, pas de fond lourd */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Une question avant de commencer ?
          </p>
          <div className="mt-3 space-y-2">
            <a
              href={AGENCY.phones[0].href}
              className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#06303A] transition hover:border-[#0A7C95] hover:shadow-sm"
            >
              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F5F8] text-[#0A7C95]">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                {AGENCY.phones[0].display}
              </span>
              <ArrowRight className="h-4 w-4 text-[#0A7C95] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
            </a>
            <Link
              to={CONTACT_LINK}
              className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-[#0A7C95] hover:shadow-sm"
            >
              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition group-hover:bg-[#E8F5F8] group-hover:text-[#0A7C95]">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                Écrire un message
              </span>
              <ArrowRight className="h-4 w-4 text-[#0A7C95] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Mini-stats de réassurance — sobres, sans fond */}
        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-gray-200 pt-6">
          {[
            { value: "< 24 h", label: "Réponse" },
            { value: "Inclus", label: "Chauffeur" },
            { value: "0 €", label: "Engagement" },
          ].map(({ value, label }) => (
            <div key={label}>
              <dd className="text-lg font-extrabold tabular-nums text-[#06303A]">{value}</dd>
              <dt className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
            </div>
          ))}
        </dl>
      </aside>

      {/* ═══ Colonne droite : formulaire intégré proprement ═══ */}
      <div className="relative">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(6,48,58,0.06),0_20px_40px_-24px_rgba(6,48,58,0.15)]">
          {/* Fine bande décorative en haut (accent jaune → bleu) */}
          <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-[#F28C0F] via-[#F2B705] to-[#0A7C95]" />

          {/* Header léger du formulaire */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F5F8] text-[#0A7C95]">
                <Send className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#06303A]">Formulaire de devis</p>
                <p className="text-xs text-gray-500">Tous les champs marqués * sont requis</p>
              </div>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[#F2F9FB] px-2.5 py-1 text-xs font-medium text-[#064B5C] ring-1 ring-[#0A7C95]/15 sm:inline-flex">
              <Clock className="h-3 w-3" aria-hidden="true" />
              ~2 min
            </span>
          </div>

          {/* Le formulaire lui-même — styles surchargés pour épouser le conteneur */}
          <div className="[&>form]:rounded-none [&>form]:shadow-none [&>form]:ring-0 [&>form]:p-5 sm:[&>form]:p-8">
            <QuoteForm vehicle={vehicle} onVehicle={setVehicle} counts={counts} maxSeats={maxSeats} />
          </div>
        </div>

        {/* Note de confiance — discrète */}
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-gray-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          Vos données restent confidentielles et servent uniquement à traiter votre demande.
        </p>
      </div>
    </div>
  </div>
</section>

      {lightbox !== null && photos.length > 0 && (
        <Lightbox photos={photos} index={Math.min(lightbox, photos.length - 1)} onChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </Layout>
  );
}