import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import ListState from "@/components/ListState";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  MapPin,
  Phone,
  Route as RouteIcon,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { usePublicTrip, type TripDetailData } from "@/hooks/usePublicTrips";
import { AGENCY } from "@/lib/agency";

const CURRENCY: Record<string, string> = { EUR: "€", USD: "$", TND: "TND" };
const amount = (n: number, cur: string) => `${n.toLocaleString("fr-FR")} ${CURRENCY[cur] ?? cur}`;

const toList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(String)
    : typeof v === "string"
      ? v.split(/\n|,/).map((s) => s.trim()).filter(Boolean)
      : [];

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00`)
  );

/** "Jour 1 : Tunis - Douz" -> "Tunis - Douz" (the day number is shown in a badge) */
const cleanDayTitle = (t: string) => t.replace(/^\s*jour\s*\d+\s*[:\-–]?\s*/i, "").trim() || t;

interface Photo {
  url: string;
  alt: string;
}

/** Layout of the small tiles next to the main photo, depending on how many there are */
const thumbClass = (i: number, n: number) => {
  if (n === 1) return "col-span-2 row-span-2";
  if (n === 2) return "col-span-2 row-span-1";
  if (n === 3 && i === 0) return "col-span-2 row-span-1";
  return "col-span-1 row-span-1";
};

function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto max-w-[1400px] space-y-4 px-4 pt-8 sm:px-6 lg:px-8">
        <div className="h-8 w-2/3 rounded bg-gray-200" />
        <div className="h-[260px] rounded-2xl bg-gray-200 sm:h-[380px] lg:h-[460px]" />
      </div>
      <div className="mx-auto mt-8 grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-200" />
        </div>
        <div className="h-72 rounded-2xl bg-gray-200" />
      </div>
    </div>
  );
}

export default function CircuitDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: trip, loading, error, notFound, retry } = usePublicTrip(slug);

  const [openDays, setOpenDays] = useState<Set<number>>(new Set([1]));
  const [departureId, setDepartureId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const attrs = (trip as (TripDetailData & { attributes?: Record<string, unknown> }) | null)?.attributes;
  const stops = useMemo(() => toList(attrs?.stops), [attrs]);
  const highlights = useMemo(() => toList(attrs?.highlights), [attrs]);
  const groupSize = typeof attrs?.group_size === "string" ? attrs.group_size : null;

  // Cover photo first, then the gallery, without duplicates
  const photos = useMemo<Photo[]>(() => {
    if (!trip) return [];
    const seen = new Set<string>();
    const list: Photo[] = [];
    const add = (url: string | null | undefined, alt: string | null | undefined) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push({ url, alt: alt || trip.title });
    };
    add(trip.image_url, trip.title);
    trip.images.forEach((im) => add(im.url, im.alt));
    return list;
  }, [trip]);

  // Lightbox: keyboard navigation + scroll lock
  useEffect(() => {
    if (lightbox === null) return;
    const total = photos.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % total));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + total) % total));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, photos.length]);

  if (loading) {
    return (
      <Layout>
        <Skeleton />
      </Layout>
    );
  }

  if (notFound || error || !trip) {
    return (
      <Layout>
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
          <ListState
            error={!notFound && !!error}
            onRetry={retry}
            icon={RouteIcon}
            title={notFound ? "Circuit introuvable" : "Impossible de charger ce circuit"}
            text={
              notFound
                ? "Ce circuit n'existe plus ou n'est plus publié. Découvrez nos autres itinéraires."
                : "Une erreur est survenue. Réessayez dans un instant."
            }
            contactSubject="circuits"
          />
          <p className="mt-6 text-center">
            <Link to="/circuit" className="font-semibold text-[#0A7C95] hover:underline">
              ← Tous les circuits
            </Link>
          </p>
        </div>
      </Layout>
    );
  }

  const nbDays = trip.duration_nights + 1;
  const sortedDays = [...trip.days].sort((a, b) => a.day_number - b.day_number);
  const selected = trip.departures.find((d) => d.id === departureId) ?? null;
  const priceShown = selected?.price ?? trip.new_price;
  const reserveTo = `/reserver/${trip.slug}${selected ? `?departure=${selected.id}` : ""}`;
  const allOpen = sortedDays.length > 0 && openDays.size === sortedDays.length;

  const main = photos[0];
  const thumbs = photos.slice(1, 5);
  const extra = photos.length - 5;

  const toggleDay = (n: number) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const go = (delta: number) =>
    setLightbox((i) => (i === null ? i : (i + delta + photos.length) % photos.length));

 
  return (
    <Layout>
      {/* ─────────────── Title + photo mosaic ─────────────── */}
      <section className="border-b border-gray-100 bg-white pb-6 pt-5 lg:pb-8">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <Link to="/" className="hover:text-[#0A7C95]">Accueil</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <Link to="/circuit" className="hover:text-[#0A7C95]">Circuits</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="line-clamp-1 text-gray-800">{trip.title}</span>
          </nav>

          <h1 className="text-2xl font-bold leading-tight text-[#06303A] sm:text-3xl lg:text-4xl">{trip.title}</h1>

          <ul className="mt-3 flex flex-wrap gap-2 text-sm text-[#064B5C]">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-3 py-1 font-medium">
              <Clock className="h-4 w-4" aria-hidden="true" /> {nbDays} jours / {trip.duration_nights} nuits
            </li>
            {trip.departure_city && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-3 py-1 font-medium">
                <MapPin className="h-4 w-4" aria-hidden="true" /> Départ de {trip.departure_city}
              </li>
            )}
            {groupSize && (
              <li className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F8] px-3 py-1 font-medium">
                <Users className="h-4 w-4" aria-hidden="true" /> {groupSize}
              </li>
            )}
          </ul>

          {/* Mosaic */}
          <div className="relative mt-5">
            {main ? (
              <div className="grid h-[260px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[380px] lg:h-[460px]">
                <button
                  type="button"
                  onClick={() => setLightbox(0)}
                  aria-label="Agrandir la photo principale"
                  className={`group relative overflow-hidden bg-gray-100 ${
                    thumbs.length > 0 ? "col-span-4 row-span-2 sm:col-span-2" : "col-span-4 row-span-2"
                  }`}
                >
                  <img
                    src={main.url}
                    alt={main.alt}
                    decoding="async"
                    fetchPriority="high"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>

                {thumbs.map((p, i) => {
                  const isLast = i === thumbs.length - 1 && extra > 0;
                  return (
                    <button
                      key={`${p.url}-${i}`}
                      type="button"
                      onClick={() => setLightbox(i + 1)}
                      aria-label={`Agrandir la photo ${i + 2}`}
                      className={`group relative hidden overflow-hidden bg-gray-100 sm:block ${thumbClass(i, thumbs.length)}`}
                    >
                      <img
                        src={p.url}
                        alt={p.alt}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {isLast && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">
                          +{extra}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#064B5C] to-[#0A7C95] sm:h-[320px]">
                <RouteIcon className="h-14 w-14 text-white/40" strokeWidth={1.5} aria-hidden="true" />
              </div>
            )}

            {photos.length > 1 && (
              <button
                type="button"
                onClick={() => setLightbox(0)}
                className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3.5 py-2 text-sm font-semibold text-[#06303A] shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A7C95]"
              >
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                Voir les {photos.length} photos
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─────────────── Content ─────────────── */}
      <section className="bg-[#F2F9FB] py-8 pb-28 lg:py-10">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
          <div className="min-w-0 space-y-6">
            {(trip.summary || trip.description || stops.length > 0 || highlights.length > 0) && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-bold text-[#06303A]">Présentation</h2>
                {trip.summary && <p className="mt-2 font-medium text-gray-700">{trip.summary}</p>}
                {trip.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">{trip.description}</p>
                )}

                {stops.length > 0 && (
                  <ol className="mt-5 flex flex-wrap items-center gap-y-2 text-sm font-semibold text-[#064B5C]" aria-label="Étapes">
                    {stops.map((s, i) => (
                      <li key={`${s}-${i}`} className="flex items-center">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ${
                              i === 0 || i === stops.length - 1
                                ? "bg-[#E3A312] ring-[#E3A312]/40"
                                : "bg-[#0A7C95] ring-[#0A7C95]/30"
                            }`}
                            aria-hidden="true"
                          />
                          {s}
                        </span>
                        {i < stops.length - 1 && (
                          <span className="mx-2 w-5 border-t-2 border-dashed border-gray-300" aria-hidden="true" />
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {highlights.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {highlights.map((h, i) => (
                      <span
                        key={`${h}-${i}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#FFF6DD] px-2.5 py-1 text-xs font-medium text-[#7A5200]"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden="true" /> {h}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sortedDays.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#06303A]">Programme jour par jour</h2>
                  <button
                    type="button"
                    onClick={() => setOpenDays(allOpen ? new Set() : new Set(sortedDays.map((d) => d.day_number)))}
                    className="text-sm font-semibold text-[#0A7C95] hover:underline"
                  >
                    {allOpen ? "Tout replier" : "Tout déplier"}
                  </button>
                </div>

                <ol className="mt-4 space-y-2.5">
                  {sortedDays.map((d) => {
                    const open = openDays.has(d.day_number);
                    return (
                      <li key={d.day_number} className="overflow-hidden rounded-xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => toggleDay(d.day_number)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition hover:bg-[#F2F9FB]"
                        >
                          <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-[#064B5C] text-white">
                            <span className="text-[9px] font-medium uppercase leading-none opacity-80">Jour</span>
                            <span className="text-sm font-bold leading-none">{d.day_number}</span>
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-semibold text-[#06303A] sm:text-base">
                            {cleanDayTitle(d.title)}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                        {open && d.description && (
                          <div className="border-t border-gray-100 bg-[#FAFCFD] px-4 py-3.5 pl-16">
                            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{d.description}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {(trip.inclusions.length > 0 || trip.exclusions.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {trip.inclusions.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <h2 className="text-base font-bold text-[#06303A]">Le prix comprend</h2>
                    <ul className="mt-3 space-y-2">
                      {trip.inclusions.map((x, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {trip.exclusions.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <h2 className="text-base font-bold text-[#06303A]">Le prix ne comprend pas</h2>
                    <ul className="mt-3 space-y-2">
                      {trip.exclusions.map((x, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" /> {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─────────────── Booking card ─────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              {priceShown != null ? (
                <div>
                  {trip.old_price && trip.new_price && trip.old_price > trip.new_price && !selected && (
                    <p className="text-sm text-gray-400 line-through">{amount(trip.old_price, trip.currency)}</p>
                  )}
                  <p className="text-xs text-gray-500">À partir de</p>
                  <p className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#0A7C95]">{amount(priceShown, trip.currency)}</span>
                    <span className="text-sm text-gray-500">/ pers.</span>
                  </p>
                </div>
              ) : (
                <p className="text-2xl font-extrabold text-[#0A7C95]">Prix sur devis</p>
              )}

              {trip.departures.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                    <Calendar className="h-4 w-4 text-[#0A7C95]" aria-hidden="true" /> Prochains départs
                  </p>
                  <ul className="space-y-2" role="radiogroup" aria-label="Dates de départ">
                    {trip.departures.map((d) => {
                      const active = d.id === departureId;
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={d.seats_left === 0}
                            onClick={() => setDepartureId(active ? null : d.id)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              active
                                ? "border-[#0A7C95] bg-[#E8F5F8] ring-1 ring-[#0A7C95]"
                                : "border-gray-200 hover:border-[#0A7C95]"
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-semibold text-[#06303A]">{fmtDate(d.departure_date)}</span>
                              {d.seats_left != null && d.seats_left <= 5 && (
                                <span className="text-xs font-medium text-orange-600">
                                  {d.seats_left > 0 ? `Plus que ${d.seats_left} place${d.seats_left > 1 ? "s" : ""}` : "Complet"}
                                </span>
                              )}
                            </span>
                            {d.price != null && (
                              <span className="text-sm font-bold text-[#0A7C95]">{amount(d.price, trip.currency)}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <Link
                to={reserveTo}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-5 py-3.5 text-base font-bold text-[#06303A] shadow-md transition hover:shadow-lg hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064B5C] focus-visible:ring-offset-2"
              >
                {priceShown != null ? "Réserver ce circuit" : "Demander un devis"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <a
                href={AGENCY.phones[0].href}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-[#0A7C95] hover:text-[#0A7C95]"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {AGENCY.phones[0].display}
              </a>
            </div>
          </aside>
        </div>
      </section>

      {/* Barre d'action mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-500">{priceShown != null ? "À partir de" : "Tarif"}</p>
          <p className="truncate text-lg font-extrabold leading-none text-[#0A7C95]">
            {priceShown != null ? amount(priceShown, trip.currency) : "Sur devis"}
          </p>
        </div>
        <Link to={reserveTo} className="rounded-xl bg-gradient-to-r from-[#F28C0F] to-[#F2B705] px-6 py-2.5 text-sm font-bold text-[#06303A] shadow-md">
          {priceShown != null ? "Réserver" : "Demander un devis"}
        </Link>
      </div>

{lightbox !== null &&
  photos[lightbox] &&
  createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photos"
      className="fixed inset-0 z-[1000] flex h-[100dvh] w-screen flex-col bg-black/95"
      onClick={() => setLightbox(null)}
    >
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm tabular-nums text-white/80">
          {lightbox + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={() => setLightbox(null)}
          aria-label="Fermer"
          className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16">
        <img
          src={photos[lightbox].url}
          alt={photos[lightbox].alt}
          onClick={(e) => e.stopPropagation()}
          className="block h-auto w-auto min-w-0 max-w-full rounded-lg object-contain max-h-[calc(100dvh-11rem)]"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white transition hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-4"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div
          className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => setLightbox(i)}
              aria-label={`Voir la photo ${i + 1}`}
              aria-current={i === lightbox}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition ${
                i === lightbox ? "border-[#F2B705]" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )}
    </Layout>
  );
}