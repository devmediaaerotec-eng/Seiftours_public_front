import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ListState from "@/components/ListState";
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock, Globe, Lock, MapPin, Minus, Phone, Plane, Plus, Send, ShieldCheck, Users,
} from "lucide-react";
import { usePublicTrip, type TripDeparture } from "@/hooks/usePublicTrips";

const API = import.meta.env.VITE_API_URL ?? "";
const money = (n: number) => n.toLocaleString("fr-FR");
const fmt = (iso: string, o: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", o);

const DETAIL: Record<string, string> = { omra: "/omra", organized: "/voyage-organise", circuit: "/circuit" };

// text-base (16px) : évite le zoom automatique d'iOS dans les champs
const input =
  "block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#0A7C95] focus:ring-2 focus:ring-[#0A7C95]/20 aria-[invalid=true]:border-red-500";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="flex items-center gap-3 text-lg font-extrabold text-[#06303A]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F28C0F] to-[#F2B705] text-sm font-extrabold text-[#06303A]">{n}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#06303A]">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm font-medium text-red-600">{error}</p>
        : hint ? <p className="mt-1.5 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Counter({ id, label, sub, value, min, max, onChange }: { id: string; label: string; sub: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn = "flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0A7C95]/30 text-[#064B5C] transition hover:bg-[#E8F5F8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F2F9FB] px-4 py-3">
      <div>
        <p id={id} className="font-bold text-[#06303A]">{label}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={id}>
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Moins de ${label.toLowerCase()}`}><Minus className="h-4 w-4" /></button>
        <output className="w-6 text-center text-lg font-extrabold text-[#06303A]" aria-live="polite">{value}</output>
        <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Plus de ${label.toLowerCase()}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function Reservation() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const { data: trip, loading, error, notFound, retry } = usePublicTrip(slug);

  const [departureId, setDepartureId] = useState<number | null>(null);
  const [date, setDate] = useState("");                         // date libre quand le voyage n'a pas de départ publié
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [f, setF] = useState({ name: "", phone: "", email: "", message: "", website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    if (!trip) return;
    document.title = `Réserver ${trip.title} | Seif Tours`;
    const wanted = Number(params.get("departure"));
    const found = trip.departures.find((d) => d.id === wanted);
    setDepartureId(found ? found.id : trip.departures.length === 1 ? trip.departures[0].id : null);
  }, [trip, params]);

  const departure: TripDeparture | undefined = trip?.departures.find((d) => d.id === departureId);
  const unit = departure?.price ?? trip?.new_price ?? null;
  const childUnit = departure?.child_price ?? unit;
  const total = useMemo(
    () => (unit == null ? null : adults * unit + children * (childUnit ?? unit)),
    [unit, childUnit, adults, children],
  );

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-[1100px] animate-pulse px-4 py-10 sm:px-6" aria-busy="true">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]"><div className="h-[520px] rounded-3xl bg-gray-200" /><div className="h-80 rounded-3xl bg-gray-200" /></div>
        </div>
      </Layout>
    );
  }
  if (notFound || error || !trip) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <ListState error={!!error} onRetry={retry} icon={Globe} title="Ce voyage n'est plus disponible"
            text="Il a peut-être été retiré. Découvrez nos autres départs ou contactez-nous." contactSubject="trips" />
          <p className="mt-6 text-center"><Link to="/voyage-organise" className="font-semibold text-[#0A7C95] hover:underline">← Voir tous les voyages</Link></p>
        </div>
      </Layout>
    );
  }

  const detailTo = `${DETAIL[trip.type] ?? "/voyage-organise"}/${trip.slug}`;
  const quote = unit == null;

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError("");
    const e: Record<string, string> = {};
    if (trip.departures.length > 0 && !departure) e.departure = "Choisissez une date de départ.";
    if (f.name.trim().length < 2) e.name = "Indiquez votre nom.";
    if (!/^\+?[0-9][0-9 .\-()]{6,24}$/.test(f.phone.trim())) e.phone = "Numéro de téléphone invalide.";
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Adresse e-mail invalide.";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) { document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" }); document.getElementById(first)?.focus({ preventScroll: true }); return; }

    setSending(true);
    try {
      const res = await fetch(`${API}/api/public/trip-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          trip_id: trip.id, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim() || undefined,
          adults, children, preferred_date: departure?.departure_date ?? (date || undefined),
          message: f.message.trim() || undefined, website: f.website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors(json.violations ?? {}); setFormError(json.message ?? `Erreur ${res.status}`); return; }
      setDone(json.reference);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFormError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setSending(false);
    }
  };

  /* ------------------------------- confirmation ------------------------------- */
  if (done) {
    return (
      <Layout>
        <div className="bg-[#F2F9FB] px-4 py-12 sm:py-16">
          <div role="status" className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-lg sm:p-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-9 w-9 text-emerald-600" /></span>
            <h1 className="mt-5 text-2xl font-extrabold text-[#06303A]">Demande envoyée, merci !</h1>
            <p className="mt-2 text-gray-600">Notre équipe vous appelle très vite pour confirmer la disponibilité et finaliser votre réservation.</p>
            <p className="mt-5 inline-block rounded-xl bg-[#E8F5F8] px-4 py-2 text-sm text-[#064B5C]">Référence : <strong className="font-mono text-base">{done}</strong></p>
            <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-gray-700">
              {["Nous vérifions les places pour votre date.", "Un conseiller vous contacte au numéro indiqué.", "Vous confirmez, puis nous finalisons ensemble."].map((s, i) => (
                <li key={s} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#064B5C] text-xs font-bold text-white">{i + 1}</span>{s}</li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/" className="rounded-xl bg-[#064B5C] px-6 py-3 text-sm font-bold text-white hover:bg-[#0A7C95]">Retour à l'accueil</Link>
              <Link to={DETAIL[trip.type] ?? "/voyage-organise"} className="rounded-xl border-2 border-[#064B5C] px-6 py-3 text-sm font-bold text-[#064B5C] hover:bg-[#064B5C] hover:text-white">Voir d'autres offres</Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  /* --------------------------------- résumé --------------------------------- */
  const summary = (
    <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-lg">
      <div className="relative aspect-[16/8] bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
        {trip.image_url && <img src={trip.image_url} alt="" className="h-full w-full object-cover" decoding="async" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#031E26]/80 to-transparent" />
        <p className="absolute inset-x-4 bottom-3 line-clamp-2 text-lg font-extrabold leading-snug text-white">{trip.title}</p>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <ul className="space-y-1.5 text-gray-600">
          {trip.destination && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#E3A312]" />{trip.destination}</li>}
          <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#E3A312]" />{trip.duration_nights + 1} jours / {trip.duration_nights} nuit{trip.duration_nights > 1 ? "s" : ""}</li>
          <li className="flex items-center gap-2"><Plane className="h-4 w-4 text-[#E3A312]" />Départ de {trip.departure_city}</li>
          <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#E3A312]" />{departure ? fmt(departure.departure_date, { weekday: "short", day: "2-digit", month: "long", year: "numeric" }) : date ? fmt(date) : "Date à choisir"}</li>
          <li className="flex items-center gap-2"><Users className="h-4 w-4 text-[#E3A312]" />{adults} adulte{adults > 1 ? "s" : ""}{children ? ` · ${children} enfant${children > 1 ? "s" : ""}` : ""}</li>
        </ul>
        <div className="border-t border-gray-100 pt-3">
          {quote ? (
            <p className="font-bold text-[#0A7C95]">Prix communiqué sur devis</p>
          ) : (
            <>
              {unit != null && <p className="flex justify-between text-gray-600"><span>{adults} × {money(unit)} {trip.currency}</span><span>{money(adults * unit)}</span></p>}
              {children > 0 && childUnit != null && <p className="flex justify-between text-gray-600"><span>{children} × {money(childUnit)} {trip.currency}</span><span>{money(children * childUnit)}</span></p>}
              <p className="mt-2 flex items-baseline justify-between"><span className="font-bold text-[#06303A]">Total estimé</span>
                <span className="text-2xl font-extrabold text-[#0A7C95]">{money(total ?? 0)} <span className="text-sm font-semibold text-gray-500">{trip.currency}</span></span></p>
              <p className="mt-1 text-xs text-gray-500">Estimation indicative, confirmée par l'agence.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div ref={top} className="bg-[#F2F9FB] pb-32 lg:pb-16">
        <div className="mx-auto max-w-[1100px] px-4 pt-6 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
            <Link to={detailTo} className="inline-flex items-center gap-1.5 font-semibold text-[#0A7C95] hover:underline"><ArrowLeft className="h-4 w-4" />Retour à l'offre</Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /><span>Réservation</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-[#06303A] sm:text-3xl">{quote ? "Demande de devis" : "Finalisez votre réservation"}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Aucun paiement maintenant : l'agence vous contacte pour confirmer.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
            <form id="reservation-form" onSubmit={submit} noValidate className="min-w-0 space-y-5">
              <Section n={1} title="Votre départ">
                {trip.departures.length > 0 ? (
                  <fieldset aria-describedby={errors.departure ? "departure-err" : undefined}>
                    <legend className="sr-only">Date de départ</legend>
                    <ul id="departure" tabIndex={-1} className="grid gap-2.5 sm:grid-cols-2">
                      {trip.departures.map((d) => {
                        const on = d.id === departureId;
                        const few = d.seats_left != null && d.seats_left <= 5;
                        return (
                          <li key={d.id}>
                            <label className={`flex h-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#0A7C95] ${on ? "border-[#F28C0F] bg-[#FFF8EA]" : "border-gray-200 hover:border-[#0A7C95]/40"}`}>
                              <input type="radio" name="departure" className="sr-only" checked={on} onChange={() => { setDepartureId(d.id); setErrors((x) => ({ ...x, departure: "" })); }} />
                              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#F28C0F]" : "border-gray-300"}`}>{on && <span className="h-2.5 w-2.5 rounded-full bg-[#F28C0F]" />}</span>
                              <span className="flex-1 text-sm">
                                <span className="block font-bold text-[#06303A]">{fmt(d.departure_date, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                                {d.return_date && <span className="block text-xs text-gray-500">Retour le {fmt(d.return_date)}</span>}
                                {few && <span className="block text-xs font-semibold text-[#C2410C]">Plus que {d.seats_left} place{d.seats_left! > 1 ? "s" : ""}</span>}
                              </span>
                              {d.price != null && <span className="text-sm font-extrabold text-[#0A7C95]">{money(d.price)}</span>}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {errors.departure && <p id="departure-err" role="alert" className="mt-2 text-sm font-medium text-red-600">{errors.departure}</p>}
                  </fieldset>
                ) : (
                  <Field id="date" label="Date de départ souhaitée" hint="Aucun départ publié : indiquez la période qui vous convient.">
                    <input id="date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
                  </Field>
                )}
              </Section>

              <Section n={2} title="Voyageurs">
                <div className="space-y-3">
                  <Counter id="adults-l" label="Adultes" sub="12 ans et plus" value={adults} min={1} max={20} onChange={setAdults} />
                  <Counter id="children-l" label="Enfants" sub="Moins de 12 ans" value={children} min={0} max={20} onChange={setChildren} />
                </div>
              </Section>

              <Section n={3} title="Vos coordonnées">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field id="name" label="Nom complet *" error={errors.name}>
                      <input id="name" value={f.name} onChange={set("name")} autoComplete="name" aria-invalid={!!errors.name} className={input} />
                    </Field>
                  </div>
                  <Field id="phone" label="Téléphone *" error={errors.phone} hint="Pour vous rappeler rapidement.">
                    <input id="phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="+216 …" aria-invalid={!!errors.phone} className={input} />
                  </Field>
                  <Field id="email" label="E-mail" error={errors.email}>
                    <input id="email" type="email" inputMode="email" value={f.email} onChange={set("email")} autoComplete="email" aria-invalid={!!errors.email} className={input} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="message" label="Un message ? (facultatif)">
                      <textarea id="message" rows={3} value={f.message} onChange={set("message")} placeholder="Type de chambre, besoins particuliers…" className={input} />
                    </Field>
                  </div>
                </div>
                <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label>Site web<input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></label>
                </div>
              </Section>

              {formError && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</p>}

              <button type="submit" disabled={sending}
                className="hidden h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2 disabled:opacity-60 lg:flex">
                <Send className="h-5 w-5" />{sending ? "Envoi en cours…" : quote ? "Envoyer ma demande de devis" : "Envoyer ma réservation"}
              </button>
            </form>

            <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
              {summary}
              <ul className="mt-4 hidden space-y-2 text-sm text-gray-600 lg:block">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#0A7C95]" />Réponse rapide d'un conseiller</li>
                <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-[#0A7C95]" />Vos données ne servent qu'à traiter votre demande</li>
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#0A7C95]" />Sans engagement jusqu'à confirmation</li>
              </ul>
            </aside>
          </div>
        </div>
      </div>

      {/* Barre d'action mobile : total toujours visible + bouton d'envoi */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">{quote ? "Tarif" : "Total estimé"}</p>
          <p className="truncate text-lg font-extrabold leading-none text-[#0A7C95]">{quote ? "Sur devis" : `${money(total ?? 0)} ${trip.currency}`}</p>
        </div>
        <button type="submit" form="reservation-form" disabled={sending}
          className="ml-auto inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 text-sm font-bold text-[#06303A] shadow-md disabled:opacity-60">
          <Send className="h-4 w-4" />{sending ? "Envoi…" : quote ? "Demander un devis" : "Réserver"}
        </button>
      </div>
    </Layout>
  );
}
