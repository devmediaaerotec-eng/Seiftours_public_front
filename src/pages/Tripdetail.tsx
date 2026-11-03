import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ListState from "@/components/ListState";
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, CircleCheck, CircleX, Clock, Globe, MapPin, Plane, Users,
} from "lucide-react";
import { usePublicTrip, type TripDeparture } from "@/hooks/usePublicTrips";

const money = (n: number) => n.toLocaleString("fr-FR");
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) =>
  new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", opts);

const BACK: Record<string, { to: string; label: string }> = {
  omra: { to: "/omra", label: "Toutes les offres Omra" },
  organized: { to: "/voyage-organise", label: "Tous les voyages organisés" },
  circuit: { to: "/voyage-organise", label: "Tous les voyages" },
};

export default function TripDetail() {
  const { slug } = useParams();
  const { data: trip, loading, error, notFound, retry } = usePublicTrip(slug);
  const [photo, setPhoto] = useState(0);
  const [departureId, setDepartureId] = useState<number | null>(null);

  // Galerie = couverture + photos (sans doublon)
  const photos = useMemo(() => {
    if (!trip) return [];
    const list = [...(trip.image_url ? [{ url: trip.image_url, alt: trip.title }] : []), ...trip.images];
    return list.filter((p, i, a) => a.findIndex((x) => x.url === p.url) === i);
  }, [trip]);

  const departure: TripDeparture | undefined = trip?.departures.find((d) => d.id === departureId);
  const price = departure?.price ?? trip?.new_price ?? null;

  useEffect(() => {
    if (trip) document.title = `${trip.title} | Seif Tours`;
    setPhoto(0);
    setDepartureId(null);
  }, [trip]);

  if (loading) return <Layout><DetailSkeleton /></Layout>;

  if (notFound || error || !trip) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-20">
          <ListState
            error={!!error}
            onRetry={retry}
            icon={Globe}
            title="Ce voyage n'est plus disponible"
            text="Il a peut-être été retiré ou son adresse a changé. Découvrez nos autres départs ou contactez-nous."
            contactSubject="trips"
          />
          <p className="mt-6 text-center">
            <Link to="/voyage-organise" className="font-semibold text-[#0A7C95] hover:underline">← Voir tous les voyages</Link>
          </p>
        </div>
      </Layout>
    );
  }

  const back = BACK[trip.type] ?? BACK.organized;
  // La page de réservation reprend le départ choisi ici (?departure=ID)
  const reserveTo = `/reserver/${trip.slug}${departure ? `?departure=${departure.id}` : ""}`;
  const discount = trip.new_price && trip.old_price && trip.old_price > trip.new_price
    ? Math.round((1 - trip.new_price / trip.old_price) * 100) : 0;

  return (
    <Layout>
      <div className="bg-[#F2F9FB] pb-24 lg:pb-16">
        <div className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6 lg:px-8">
          <Link to={back.to} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A7C95] hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
          </Link>

          <header className="mt-4">
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-gray-600">
              {trip.destination && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#E3A312]" aria-hidden="true" />{trip.destination}</span>
              )}
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-[#E3A312]" aria-hidden="true" />
                {trip.duration_nights + 1} jours / {trip.duration_nights} nuit{trip.duration_nights > 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1.5"><Plane className="h-4 w-4 text-[#E3A312]" aria-hidden="true" />Départ de {trip.departure_city}</span>
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-[#06303A] sm:text-4xl">{trip.title}</h1>
            {trip.summary && <p className="mt-2 max-w-3xl text-gray-600">{trip.summary}</p>}
          </header>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* ------------------------------ colonne principale ------------------------------ */}
            <div className="min-w-0 space-y-8">
              {/* Galerie */}
              <section aria-label="Photos">
                <div className="skeleton aspect-[16/10] overflow-hidden rounded-3xl bg-gradient-to-br from-[#064B5C] to-[#0A7C95]">
                  {photos[photo] ? (
                    <img src={photos[photo].url} alt={photos[photo].alt ?? trip.title} className="h-full w-full object-cover" decoding="async" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Globe className="h-16 w-16 text-white/35" strokeWidth={1.5} aria-hidden="true" /></div>
                  )}
                </div>
                {photos.length > 1 && (
                  <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {photos.map((p, i) => (
                      <li key={p.url} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setPhoto(i)}
                          aria-label={`Photo ${i + 1}`}
                          aria-current={i === photo}
                          className={`h-16 w-24 overflow-hidden rounded-xl border-2 transition ${i === photo ? "border-[#F28C0F]" : "border-transparent opacity-70 hover:opacity-100"}`}
                        >
                          <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {trip.description && (
                <section className="rounded-3xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-extrabold text-[#06303A]">Présentation</h2>
                  <div className="mt-3 space-y-3 text-gray-700">
                    {trip.description.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line leading-relaxed">{para}</p>)}
                  </div>
                </section>
              )}

              {/* Inclus / non inclus */}
              {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
                <section className="grid gap-4 md:grid-cols-2">
                  {trip.inclusions.length > 0 && (
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                      <h2 className="text-lg font-extrabold text-[#06303A]">Ce qui est inclus</h2>
                      <ul className="mt-3 space-y-2">
                        {trip.inclusions.map((x, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0A7C95]" aria-hidden="true" />{x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trip.exclusions.length > 0 && (
                    <div className="rounded-3xl bg-white p-6 shadow-sm">
                      <h2 className="text-lg font-extrabold text-[#06303A]">Non inclus</h2>
                      <ul className="mt-3 space-y-2">
                        {trip.exclusions.map((x, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />{x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              {/* Programme */}
              {trip.days.length > 0 && (
                <section className="rounded-3xl bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-extrabold text-[#06303A]">Programme jour par jour</h2>
                  <ol className="mt-4 space-y-2">
                    {trip.days.map((d, i) => (
                      <li key={d.day_number}>
                        <details open={i === 0} className="group rounded-2xl border border-gray-200/80 open:bg-[#F7FBFC]">
                          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F28C0F] to-[#F2B705] text-sm font-extrabold text-[#06303A]">
                              J{d.day_number}
                            </span>
                            <span className="flex-1 font-bold text-[#06303A]">{d.title}</span>
                            <ChevronDown className="h-4 w-4 text-gray-400 transition group-open:rotate-180" aria-hidden="true" />
                          </summary>
                          {d.description && <p className="whitespace-pre-line px-4 pb-4 pl-16 text-sm leading-relaxed text-gray-700">{d.description}</p>}
                        </details>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            {/* ------------------------------ colonne réservation ------------------------------ */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-lg">
                {discount > 0 && (
                  <span className="mb-2 inline-block rounded-full bg-[#F2B705] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#06303A]">-{discount}%</span>
                )}
                {price != null ? (
                  <>
                    {!departure && trip.old_price && trip.new_price && trip.old_price > trip.new_price && (
                      <p className="text-sm text-gray-400 line-through">{money(trip.old_price)} {trip.currency}</p>
                    )}
                    <p className="text-xs text-gray-500">{departure ? "Prix par personne" : "À partir de"}</p>
                    <p className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[#0A7C95]">{money(price)}</span>
                      <span className="text-sm text-gray-500">{trip.currency} / pers.</span>
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-extrabold text-[#0A7C95]">Prix sur devis</p>
                )}

                {trip.departures.length > 0 ? (
                  <fieldset className="mt-5">
                    <legend className="flex items-center gap-1.5 text-sm font-bold text-[#06303A]">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" /> Choisissez votre départ
                    </legend>
                    <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                      {trip.departures.map((d) => {
                        const on = d.id === departureId;
                        const few = d.seats_left != null && d.seats_left <= 5;
                        return (
                          <li key={d.id}>
                            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2.5 transition ${on ? "border-[#F28C0F] bg-[#FFF8EA]" : "border-gray-200 hover:border-[#0A7C95]/40"}`}>
                              <input type="radio" name="departure" className="sr-only" checked={on} onChange={() => setDepartureId(d.id)} />
                              <span className="flex-1 text-sm">
                                <span className="block font-bold text-[#06303A]">{fmt(d.departure_date, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</span>
                                {d.return_date && <span className="block text-xs text-gray-500">Retour le {fmt(d.return_date)}</span>}
                                {few && <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#C2410C]"><Users className="h-3 w-3" aria-hidden="true" />Plus que {d.seats_left} place{d.seats_left! > 1 ? "s" : ""}</span>}
                              </span>
                              {d.price != null && <span className="text-sm font-extrabold text-[#0A7C95]">{money(d.price)} {trip.currency}</span>}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    {departure && (departure.single_supplement || departure.child_price) && (
                      <dl className="mt-3 space-y-1 rounded-xl bg-[#F2F9FB] p-3 text-xs text-gray-600">
                        {departure.single_supplement != null && departure.single_supplement > 0 && (
                          <div className="flex justify-between"><dt>Supplément chambre single</dt><dd className="font-semibold">+ {money(departure.single_supplement)} {trip.currency}</dd></div>
                        )}
                        {departure.child_price != null && (
                          <div className="flex justify-between"><dt>Enfant</dt><dd className="font-semibold">{money(departure.child_price)} {trip.currency}</dd></div>
                        )}
                      </dl>
                    )}
                  </fieldset>
                ) : (
                  <p className="mt-5 rounded-xl bg-[#F2F9FB] p-3 text-sm text-gray-600">Les dates de départ seront communiquées à la demande de devis.</p>
                )}

                <Link
                  to={reserveTo}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] py-3.5 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
                >
                  {price != null ? "Réserver" : "Demander un devis"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to={`/contact?subject=trips#contact-form`} className="mt-3 block text-center text-sm font-semibold text-[#064B5C] hover:underline">
                  Une question ? Contactez-nous
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Barre d'action mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div>
          <p className="text-[11px] text-gray-500">{price != null ? "À partir de" : "Tarif"}</p>
          <p className="text-lg font-extrabold leading-none text-[#0A7C95]">{price != null ? `${money(price)} ${trip.currency}` : "Sur devis"}</p>
        </div>
        <Link to={reserveTo} className="rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-2.5 text-sm font-bold text-[#06303A] shadow-md">
          {price != null ? "Réserver" : "Demander un devis"}
        </Link>
      </div>

    </Layout>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <div className="h-4 w-48 rounded bg-gray-200" />
      <div className="mt-4 h-9 w-2/3 rounded bg-gray-200" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="aspect-[16/10] rounded-3xl bg-gray-200" />
        <div className="h-80 rounded-3xl bg-gray-200" />
      </div>
    </div>
  );
}